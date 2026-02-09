import { RoleName, SaboteurRockGame, Player, VoteResults, Team, DUMMY_PLAYER_NAME, Meeting, Role, GameOptions, GamePhase, RoleTeamMap } from 'saboteur-lib';
const robin = require('roundrobin');
const ROLE_DATA = require('../saboteur-lib/json/roles.json');
const ROLE_DISTRIBUTION = require('../saboteur-lib/json/distributions.json');

/**
 * Processes role abilities and votes, checking for ties and victories when appropriate
 * Some roles may either not be present or abstained from their ability this round, in such a case they will be undefined
 * 
 * @param game SaboteurRockGame object to process
 */
export function processVotingResults(game: SaboteurRockGame): void {
    let currentVote = game.voteRounds[game.roundIndex];
    let results = new VoteResults();
    game.votable.forEach((player) => { results.votes.push([player, 0]); });
    // player that was silenced - may be undefined
    results.silenced = currentVote.find((vote) => vote.owner.role.ability == RoleName.SILENCER)?.abilityTarget;
    let saboteurVote: Player;
    let professorVote: Player;
    for (let vote of currentVote) {
        // process abilities
        switch (vote.owner.role.ability) {
            case RoleName.EXECUTIONER:
                if (vote.abilityTarget) {
                    results.executed = vote.abilityTarget;
                    game.usedKill = true;
                }
                break;
            case RoleName.MEDIC:
                results.sos = vote.abilityTarget;
                break;
            case RoleName.PRESIDENT:
                results.veto = vote.presidentVeto == 1 ? true : false;
                if (results.veto) { game.usedVeto = true; }
                break;
            case RoleName.SABOTEUR:
                saboteurVote = vote.target;
                break;
            case RoleName.PROFESSOR:
                professorVote = vote.target;
                break;
            default:
                break;
        }
        // count vote(s) only if the voter was not silenced
        if (vote.owner.name == results.silenced?.name) { continue; }
        for (let count of results.votes) {
            // captain's ability target is their second vote, count it
            if (vote.owner.role.ability == RoleName.CAPTAIN && count[0].name == vote.abilityTarget?.name) { count[1]++; }
            // normal vote 
            if (count[0].name == vote.target.name) { count[1]++; }
        }
    }

    // it's revealed if the professor and saboteur voted together only if they voted for the same player AND neither of them were silenced
    results.professorSaboteur = (professorVote?.name == saboteurVote?.name) &&
        (results.silenced?.role?.ability != RoleName.PROFESSOR) &&
        (results.silenced?.role?.ability != RoleName.SABOTEUR);

    // compute the player(s) with the most votes and second most votes
    // second most votes will be used in the event that the player with the most votes gets saves by the medic's SOS
    // if there is a tie for first, the second place player(s) aren't used
    results.votes.sort((p1, p2) => p2[1] - p1[1]);
    let mostVotes: number = results.votes[0][1];
    let secondMost: number;
    for (let i = 0; i < results.votes.length; i++) {
        if (results.votes[i][1] == mostVotes) {
            results.firstPlace.push(results.votes[i][0]);
            // if there is no second place, this will not work. However, there then must be a tie for first so it won't be used
            secondMost = Math.min(results.votes.length - 1, i + 1);
        } else break;
    }

    // was one of the first place players saved by the medic's SOS? If so, check for a tie
    // if SOS wasn't used, short circuit
    let sosFirst: boolean = results.sos && results.firstPlace.find((player) => player.name == results.sos.name) ? true : false;
    if (sosFirst && results.firstPlace.length > 1) { // sos saves first place, tie for first
        // remove sos player from firstplace array
        for (let i = results.firstPlace.length - 1; i >= 0; i--) {
            if (results.firstPlace[i].name == results.sos.name) {
                results.firstPlace.splice(i, 1);
                break;
            }
        }
    } else if (sosFirst && results.firstPlace.length == 1) { // sos saves first place, no tie for first
        // calculate second place array, set first place array = new second place array
        let secondPlace: Player[] = [];
        mostVotes = results.votes[secondMost][1];
        for (let i = secondMost; i < results.votes.length; i++) {
            if (results.votes[i][1] == mostVotes) {
                secondPlace.push(results.votes[i][0]);
            } else {
                break;
            }
        }
        results.firstPlace = secondPlace;
    }

    // process a tie normally, if necessary
    results.tie = results.firstPlace.length > 1;
    if (!results.tie) {
        // at this point, there will only be one player in the first place array
        results.eliminated = results.firstPlace[0];
        // check if the turncoat changes sides, then check for a victory
        game.voteResults[game.roundIndex] = results;
        if (!results.veto && (game.roundIndex > 0 || (game.roundIndex == 0 && game.options.roundOneElimination))) {
            turncoatCheck(game);
            game.victory = victoryCheck(game);
        }
    } else {
        // setting this lets the UI know to jump into the tiebreaker flow
        results.tieResolved = false;
        game.voteResults[game.roundIndex] = results;
    }
}

/**
 * Processes eliminated and executed players
 * At this point, disconnected players are assumed to not reconnect, so they aren't considered here
 * @param mockElimination boolean to say whether to actually eliminate players from the game or not(for victory checking purposes) - false actually eliminates players
 * @param game SaboteurRockGame object
 * @returns the list of remaining players
 */
export function doPlayerElimination(mockElimination: boolean, game: SaboteurRockGame): Player[] {
    let eliminated: string = game.voteResults[game.roundIndex].eliminated?.name;
    let executed: string = game.voteResults[game.roundIndex].executed?.name;
    let sos: string = game.voteResults[game.roundIndex].sos?.name;
    // mockElimination tells whether to modify the game's players in place or modify a copy when marking the eliminated player(s) as dead
    let players = mockElimination ? [...game.players] : game.players;
    // check connected players for eliminated & executed
    for (let i = players.length - 1; i >= 0; i--) {
        if (((players[i].name == eliminated || players[i].name == executed) && players[i].name != sos) || players[i].name == DUMMY_PLAYER_NAME) {
            let player = players.splice(i, 1)[0];
            if (!mockElimination) {
                player.isDead = true;
                game.dead.push(player);
            }
        }
    }
    return players;
}

/**
 * Checks a game to see if victory conditions are met
 * Passengers win if the Saboteur is eliminated or executed
 * Stowaways win if their # exceeds the # of passengers, or if just one passenger is left with the Saboteur
 * @param game SaboteurRockGame object to check for a win
 * @returns the winning team, or null if victory conditions have not been met for either team
 */
export function victoryCheck(game: SaboteurRockGame): Team {
    // dummy remove players before victory checking
    let players = doPlayerElimination(true, game);

    let passengerCt = players.filter((player) => { return player.role?.team == Team.PASSENGERS; }).length;
    let stowawayCt = players.filter((player) => { return player.role?.team == Team.STOWAWAYS; }).length;
    if (game.voteResults[game.roundIndex].eliminated.role.ability == RoleName.SABOTEUR ||
        game.voteResults[game.roundIndex].executed?.role?.ability == RoleName.SABOTEUR) { return Team.PASSENGERS; }
    else if (stowawayCt > passengerCt || (stowawayCt == 1 && passengerCt == 1)) { return Team.STOWAWAYS; }
    else { return null; }
}

/**
 * Changes the Turncoat over to the Stowaways if the President is eliminated or killed
 * @param game SaboteurRockGame object to check
 */
export function turncoatCheck(game: SaboteurRockGame): void {
    let results = game.voteResults[game.roundIndex];
    if (results.eliminated.role.ability == RoleName.PRESIDENT ||
        (results.executed?.role?.ability == RoleName.PRESIDENT && results.sos?.role?.ability != RoleName.PRESIDENT)) {
        let turncoat = game.players.find((player) => player.role?.ability == RoleName.TURNCOAT);
        if (turncoat) {
            turncoat.role.team = Team.STOWAWAYS;
            let idx = game.passengers.indexOf(turncoat);
            game.passengers.splice(idx, 1);
            game.stowaways.push(turncoat);
        }
    }
}

/**
 * Generates a new round - consisting of a series of deliberations, which are arrays of Meetings
 * @param game SaboteurRockGame object to generate a round for
 */
export function generateRound(game: SaboteurRockGame): void {
    let players = game.players;
    let numDeliberations;
    switch (players.length) {
        case 14:
        case 13:
        case 12:
            numDeliberations = 6;
            break;
        case 11:
        case 10:
        case 9:
        case 8:
            numDeliberations = 5;
            break;
        case 7:
        case 6:
        case 5:
            numDeliberations = 4;
            break;
        case 4:
        case 3:
            numDeliberations = 2;
            break;
        default:
            // debug only
            numDeliberations = 1;
            break;
    }

    // insert dummy player to represent no meeting if there's an odd number of players
    if (players.length % 2 != 0) { players.push(new Player(DUMMY_PLAYER_NAME, -1, false)); }

    let scrambled = shuffle(players); // randomly assign player indexes each round
    let rr = shuffle(robin(scrambled.length).slice(0, numDeliberations));
    let round: Meeting[][] = [];
    let counter = 0;
    rr.forEach((row) => {
        let deliberation: Meeting[] = [];
        for (let i = 0; i < row.length; i++) {
            // subtract 1 from index since robin() function indexes from 1, not 0
            let meeting = new Meeting(scrambled[row[i][0] - 1], scrambled[row[i][1] - 1], game.options.rooms[counter]);
            deliberation.push(meeting);
            counter++;
        }
        counter = 0;
        round.push(deliberation);
    });

    // do check to disable medic's ability for the next round
    // normal games will only do this check beyond round 1
    // custom games will do this check every round
    if (game.roundIndex >= (game.custom ? 0 : 1)) {
        let currentSos = game.voteResults[game.roundIndex].sos;
        // if both the current sos and last round sos exist and are the same, block its use next round
        if (currentSos?.name && game.lastUsedSos?.name && (currentSos.name.toLowerCase() == game.lastUsedSos.name.toLowerCase())) { game.disableSos = true; }
        else { game.disableSos = false; }
        game.lastUsedSos = game.voteResults[game.roundIndex].sos;
    }

    game.rounds.push(round);
    // reset for next round
    game.roundIndex++;
    game.deliberationIndex = 0;
    game.voteResults[game.roundIndex] = null;
    game.state = GamePhase.TRANSITION;
}

/**
 * Given a role name, returns the appropriate Role object
 * @param role name of role to retrieve
 * @returns role object
 */
export function getRoleFromName(role: RoleName): Role {
    return new Role(
        role,
        RoleTeamMap.get(role),
        role,
        ROLE_DATA[role].description,
        ROLE_DATA[role].card,
        ROLE_DATA[role].tip,
        ROLE_DATA[role].prompt,
        ROLE_DATA[role].withhold
    );

}

/**
 * Randomly assigns roles to players in a game
 * Uses distributions.json to achieve the correct assignment of roles and teams
 * @param game SaboteurRockGame object
 */
export function assignPlayerRoles(game: SaboteurRockGame): void {
    let players = game.players;
    let playersLeft: Player[] = players;
    let distribution = ROLE_DISTRIBUTION[players.length];

    // assign a player to be the Saboteur
    let saboteurRole: Role = getRoleFromName(RoleName.SABOTEUR);
    let toRemove = players[randomInt(players.length)].assignRole(saboteurRole);
    playersLeft = playersLeft.filter((player) => {
        return player.name !== toRemove.name;
    });

    // assign passengers
    let passengerRoles: string[] = [...distribution[Team.PASSENGERS]];
    for (let i = 0; i < distribution['numPassengers']; i++) {
        let roleIndex = randomInt(passengerRoles.length);
        let playerIndex = randomInt(playersLeft.length);

        let toAssign = playersLeft[playerIndex];
        let roleData = ROLE_DATA[RoleName[passengerRoles[roleIndex]]];
        let role: Role = getRoleFromName(RoleName[roleData.name]);

        players.find((player) => player.name == toAssign.name).assignRole(role);
        playersLeft.splice(playerIndex, 1);
        passengerRoles.splice(roleIndex, 1);
    }

    // assign stowaways
    let stowawayRoles: string[] = [...distribution[Team.STOWAWAYS]];
    for (let i = 0; i < distribution['numStowaways']; i++) {
        let roleIndex = randomInt(stowawayRoles.length);
        let playerIndex = randomInt(playersLeft.length);

        let toAssign = playersLeft[playerIndex];
        let roleData = ROLE_DATA[RoleName[stowawayRoles[roleIndex]]];
        let role: Role = getRoleFromName(RoleName[roleData.name]);

        players.find((player) => player.name == toAssign.name).assignRole(role);
        playersLeft.splice(playerIndex, 1);
        stowawayRoles.splice(roleIndex, 1);
    }

    game.graveyard = passengerRoles.concat(stowawayRoles);
    // randomly assign Ghost's ability from those left
    // choose the card for the detective to see afterwards
    let ghost = players.find((player) => player.role.name == RoleName.GHOST);
    if (ghost) {
        let index = randomInt(game.graveyard.length);
        let roleData = ROLE_DATA[RoleName[game.graveyard[index]]];
        ghost.role.ability = RoleName[roleData.ability];
        ghost.role.description = roleData.description;
        ghost.role.prompt = roleData.prompt;
        ghost.role.withhold = roleData.withhold;
    }

    game.detectiveCard = RoleName[game.graveyard[randomInt(game.graveyard.length)]];

    // if President is in the graveyard and the Ghost didn't assume the role of the President, Turncoat is automatically a stowaway
    if (game.graveyard.find((role) => RoleName[role] == RoleName.PRESIDENT) && ghost.role.ability != RoleName.PRESIDENT) {
        let turncoat = players.find((player) => player.role.ability == RoleName.TURNCOAT);
        if (turncoat) { turncoat.role.team = Team.STOWAWAYS; }
    }

    game.teamMetrics = { numPassengers: distribution['numPassengers'], numStowaways: distribution['numStowaways'] };
    game.passengers = game.players.filter((player) => player.socketID != -1 && player.role?.team == Team.PASSENGERS);
    game.stowaways = game.players.filter((player) => player.socketID != -1 && player.role?.team == Team.STOWAWAYS);
}

/**
 * Adds a new player to the desired game. Callers of this function should make sure game is not null or undefined before calling
 * @param game SaboteurRockGame object
 * @param playerName name of new player
 * @param socketId ID to assign player
 * @returns the added Player object
 */
export function addPlayer(game: SaboteurRockGame, playerName: string, socketID: number): Player {
    let isHost = false;
    if (game.players.length == 0) {
        isHost = true;
        game.options = new GameOptions();
    }
    let newPlayer = new Player(playerName, socketID, isHost);
    game.addPlayer(newPlayer);
    return newPlayer;
}

/**
 * Adds a new display player to the desired game
 * @param game SaboteurRockGame object
 * @param socketId ID to assign player
 * @returns the added display Player object
 */
export function addDisplayPlayer(game: SaboteurRockGame, socketID: number) {
    let newPlayer = new Player('', socketID, false);
    newPlayer.isDisplay = true;
    game.displays.push(newPlayer);
    return newPlayer;
}

/**
 * Adjusts the number of required rooms for a game based on the current number of players
 * @param game SaboteurRockGame object
 */
export function updateRequiredRooms(game: SaboteurRockGame): void {
    if (game.state != GamePhase.PREGAME) { return; } // don't care about this after the game has started
    game.options.requiredRooms = Math.ceil(game.players.length / 2);
}

/**
 * @param max 
 * @returns a random integer between 0 and max (exclusive)
 */
export function randomInt(max: number): number {
    return Math.floor(Math.random() * max);
}

/**
 * Randomly shuffles elements of an array around
 * @param array 
 * @returns a randomly shuffled array 
 */
export function shuffle(array: any[]): any[] {
    let currentIndex = array.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex--);
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}