
/* 
*  Tests for server.ts, everything in here is very ad hoc and not meant to be thorough.
*  Bring-up testing and playtesting cover more niche situations and general usability. 
*/

import { exit } from 'process';
import { assert } from 'console';
import { GameOptions, Meeting, Player, Role, RoleName, SaboteurRockGame, Team, Vote, VoteResults } from '../types';
import { assignPlayerRoles, generateRound, processVotingResults, turncoatCheck, victoryCheck } from './src/server';
console.debug('Running tests...')

let game = new SaboteurRockGame('FAKE', 'Test Game');

let noah = new Player('noah', 0, true);
noah.assignRole(new Role(RoleName.SABOTEUR, Team.STOWAWAYS, RoleName.SABOTEUR, ""));
game.addPlayer(noah);

let liv = new Player('liv', 1, false);
liv.assignRole(new Role(RoleName.ACCOMPLICE, Team.STOWAWAYS, RoleName.ACCOMPLICE, ""));
game.addPlayer(liv);

let tal = new Player('tal', 2, false);
tal.assignRole(new Role(RoleName.EXECUTIONER, Team.STOWAWAYS, RoleName.EXECUTIONER, ""));
game.addPlayer(tal);

let mac = new Player('mac', 3, false);
mac.assignRole(new Role(RoleName.SILENCER, Team.STOWAWAYS, RoleName.SILENCER, ""));
game.addPlayer(mac);

let luca = new Player('luca', 4, false);
luca.assignRole(new Role(RoleName.GHOST, Team.STOWAWAYS, RoleName.PASSENGER, ""));
game.addPlayer(luca)

let greg = new Player('greg', 5, false);
greg.assignRole(new Role(RoleName.CAPTAIN, Team.PASSENGERS, RoleName.CAPTAIN, ""));
game.addPlayer(greg);

let hannah = new Player('hannah', 6, false);
hannah.assignRole(new Role(RoleName.MEDIC, Team.PASSENGERS, RoleName.MEDIC, ""));
game.addPlayer(hannah);

let claire = new Player('claire', 7, false);
claire.assignRole(new Role(RoleName.PROFESSOR, Team.PASSENGERS, RoleName.PROFESSOR, ""));
game.addPlayer(claire);

let abby = new Player('abby', 8, false);
abby.assignRole(new Role(RoleName.DETECTIVE, Team.PASSENGERS, RoleName.DETECTIVE, ""));
game.addPlayer(abby);

let bella = new Player('bella', 9, false);
bella.assignRole(new Role(RoleName.PRESIDENT, Team.PASSENGERS, RoleName.PRESIDENT, ""));
game.addPlayer(bella);

let daws = new Player('daws', 10, false);
daws.assignRole(new Role(RoleName.TURNCOAT, Team.PASSENGERS, RoleName.TURNCOAT, ""));
game.addPlayer(daws);

let natalie = new Player('natalie', 11, false);
natalie.assignRole(new Role(RoleName.PASSENGER, Team.PASSENGERS, RoleName.PASSENGER, ""));
game.addPlayer(natalie);

let jack = new Player('jack', 12, false);
jack.assignRole(new Role(RoleName.PASSENGER, Team.PASSENGERS, RoleName.PASSENGER, ""));
game.addPlayer(jack);

let jared = new Player('jared', 13, false);
jared.assignRole(new Role(RoleName.PASSENGER, Team.PASSENGERS, RoleName.PASSENGER, ""));
game.addPlayer(jared);


let options = new GameOptions();
options.rooms = ["noah's room", "luca's room", "kitchen", "dining room", "chillzone", "luca's office", "entryway"];
game.options = options;

// testVoteProcessing1(game);
testVictoryCheckBasic(game);

console.log('Done.');
exit(1);

function testVictoryCheckBasic(game: SaboteurRockGame) {
    game.voteResults = new VoteResults();
    game.voteResults[game.roundIndex].eliminated = jared;

    // 1 - passenger is eliminated(null)
    let turncoatChange: boolean = turncoatCheck(game);
    let victory: Team = victoryCheck(game);
    assert(turncoatChange == false, 'turncoatChange 1 failed');
    assert(victory == null, 'victory 1 failed');

    // 2 - saboteur is eliminated(passengers)
    game.voteResults[game.roundIndex].eliminated = noah;
    turncoatChange = turncoatCheck(game);
    victory = victoryCheck(game);
    assert(turncoatChange == false, 'turncoatChange 2 failed');
    assert(victory == Team.PASSENGERS, 'victory 2 failed');

    // 3 - stowaway count exceeds passenger count(stowaways)
    let players = game.players;
    game.players = [jack, natalie, noah, tal, mac];
    turncoatChange = turncoatCheck(game);
    victory = victoryCheck(game);
    assert(turncoatChange == false, 'turncoatChange 3 failed');
    assert(victory == Team.STOWAWAYS, 'victory 3 failed');
    game.players = players;

    // 4 - veto(null)
    game.voteResults[game.roundIndex].eliminated = jack;
    game.voteResults[game.roundIndex].veto = true;
    turncoatChange = turncoatCheck(game);
    victory = victoryCheck(game);
    assert(turncoatChange == false, 'turncoatChange 4 failed');
    assert(victory == null, 'victory 4 failed');

    // 5 - stowaway ct and passenger ct are both 1 (stowaways)
    players = game.players;
    game.players = [natalie, noah];
    turncoatChange = turncoatCheck(game);
    victory = victoryCheck(game);
    assert(turncoatChange == false, 'turncoatChange 5 failed');
    assert(victory == Team.STOWAWAYS, 'victory 5 failed');
    game.players = players;
}

/*
    Tests:
    - Silencer's target's vote not counting - WORKING for both captain and non-captain
    - votes counted correctly
    - ability targets are correct
    - saboteur and president voting together canceled by silencer(both ways) - WORKING
    - turncoat changing sides on president being eliminated or killed & not saved - WORKING in all cases
*/
function testVoteProcessing1(game: SaboteurRockGame) {
    let noahVote: Vote = { owner: noah, target: jared }; // saboteur
    let livVote: Vote = { owner: liv, target: jack }; // accomplice
    let talVote: Vote = { owner: tal, target: natalie, abilityTarget: bella }; // executioner
    let macVote: Vote = { owner: mac, target: bella, abilityTarget: noah }; // silencer
    let lucaVote: Vote = { owner: luca, target: bella }; // ghost/passenger
    let gregVote: Vote = { owner: greg, target: noah, abilityTarget: noah }; // captain
    let hannahVote: Vote = { owner: hannah, target: greg, abilityTarget: bella }; // medic
    let claireVote: Vote = { owner: claire, target: jared }; // professor
    let abbyVote: Vote = { owner: abby, target: greg }; // detective
    let bellaVote: Vote = { owner: bella, target: luca, presidentVeto: 1 }; // president
    let dawsVote: Vote = { owner: daws, target: liv }; // turncoat
    let natalieVote: Vote = { owner: natalie, target: bella }; // passenger
    let jackVote: Vote = { owner: jack, target: liv }; // passenger
    let jaredVote: Vote = { owner: jared, target: mac }; // passenger
    let voteRound: Vote[] = [noahVote, livVote, talVote, macVote, lucaVote, gregVote, hannahVote, claireVote, abbyVote, bellaVote, dawsVote, natalieVote, jackVote, jaredVote];

    game.voteRounds[0] = voteRound;
    game.roundIndex = 0;
    game = processVotingResults(game);
    let res = game.voteResults;
    assert(res.professorSaboteur == false, 'professorSaboteur incorrect');
    assert(res.veto == true, 'veto incorrect');
    assert(res.executed.name == 'bella', 'executed incorrect');
    assert(res.sos.name == 'bella', 'sos incorrect');
    assert(res.silenced.name == 'noah', 'silenced incorrect');
    assert(res.tie == false, 'tie incorrect');
    assert(res.turncoatChange == true, 'turncoatChange incorrect');

    // manually inspec tnumber of votes
    res.votes.forEach((vote) => {
        console.log(`${vote[0].name} had ${vote[1]} votes`);
    });
}