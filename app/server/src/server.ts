import { Config } from '../config';
import { ServerError, ServerRequest, ServerMsg, DUMMY_PLAYER_NAME, GameOptions, GamePhase, MarooningAudio, Player, PlayerImg, RoleName, SaboteurRockGame, Vote, CustomPlayer, Role, Team, VoteResults } from 'saboteur-lib';
import { randomInt, processVotingResults, updateRequiredRooms, addPlayer, assignPlayerRoles, generateRound, doPlayerElimination, addDisplayPlayer, getRoleFromName } from './server-lib';
import { log, LogLevel } from './logger';
const CODES = require('../../../saboteur-lib/json/codes.json');
const MAROONING_AUDIO = require('../../../saboteur-lib/json/marooning.json');
const ROLE_DISTRIBUTION = require('../../../saboteur-lib/json/distributions.json');

import express from 'express';
const app = express();

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
const io = new Server(createServer(app), {
	cors: {
		origin: Config.whitelist
	},
	pingTimeout: 60000 // 10 minutes
});

const activeGames: Map<string, SaboteurRockGame> = new Map<string, SaboteurRockGame>(); // keeps track of active game instances
const timerMappings: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>(); // maps a game code to the timer associated with that game
const avatarMappings: Map<string, PlayerImg[]> = new Map<string, PlayerImg[]>(); // TODO: at some point, we'll have too many images to store in memory with tons of games going on

var nextID: number = 0;

io.on(ServerRequest.CONNECT, (socket: Socket) => {
	socket.data.id = generatePlayerSocketID();
	log(LogLevel.ON, null, `Player with ID ${socket.data.id} connected`);
	subscribeToBackendRequests(socket);
});

app.get('/', (req, res) => {
	res.send('<h1>Should you be here? Try port 4200. If you\'re not a dev, scram!</h1>');
});

io.listen(8080);

log(LogLevel.ERROR, null, `Server started.`);

// configure socket event listeners
function subscribeToBackendRequests(socket: Socket): void {
	socket.on(ServerRequest.DISCONNECT, (reason: string) => { onPlayerDisconnect(socket, reason); });
	socket.on(ServerRequest.CREATE_GAME, (playerName: string, avatar: Uint8Array, custom: boolean) => { onCreateGame(socket, playerName, avatar, custom); });
	socket.on(ServerRequest.JOIN_CUSTOM_GAME, (customPlayer: CustomPlayer, code: string, playerName: string) => { joinCustomGame(socket, customPlayer, code, playerName); })
	socket.on(ServerRequest.GAME_EXISTS, (code: string, sendResult) => { let exists = checkIfGameExists(code); sendResult(exists); });
	socket.on(ServerRequest.DISPLAY_JOIN, (code: string) => { joinAsDisplay(socket, code); });
	socket.on(ServerRequest.ADD_PLAYER, (code: string, playerName: string, avatar: Uint8Array) => { onAddPlayer(socket, code, playerName, avatar); });
	socket.on(ServerRequest.PLAYER_LEAVE, (code: string, name: string) => { onPlayerDisconnect(socket, name ? "host kicking them out" : "leaving via button", code, name); });
	socket.on(ServerRequest.UPDATE_OPTIONS, (code: string, options: GameOptions, force: boolean) => { onUpdateOptions(code, options); });
	socket.on(ServerRequest.GAME_START, (code: string) => { onGameStart(code); });
	socket.on(ServerRequest.BEGIN_MAROONING, (code: string) => { onMarooningStart(code); });
	socket.on(ServerRequest.END_MAROONING, (code: string) => { emitToGame(code, ServerMsg.END_MAROONING); });
	socket.on(ServerRequest.GEN_ROUND, (code: string) => { onGenerateRound(code); });
	socket.on(ServerRequest.ROUND_START, (code: string) => { onRoundStart(code) });
	socket.on(ServerRequest.TIMER_TOGGLE, (code: string) => { onTimerToggle(code); });
	socket.on(ServerRequest.SEND_TO_VOTING, (code: string, disconnected: number) => { sendToVoting(code, disconnected); });
	socket.on(ServerRequest.CAST_VOTE, (code: string, vote: Vote) => { onCastVote(code, vote); });
	socket.on(ServerRequest.CLOSE_VOTING, (code: string, disconnected: number) => { closeVoting(code, disconnected); })
	socket.on(ServerRequest.SEND_TO_TIEBREAK, (code: string) => { sendToTiebreak(code); });
	socket.on(ServerRequest.TIEBREAK_VOTE, (code: string, owner: Player, target: Player) => { onTiebreakVote(code, owner, target); });
	socket.on(ServerRequest.VICTORY, (code: string) => { processVictory(code); });
	socket.on(ServerRequest.SEND_TO_HOME, (code: string) => { emitToGame(code, ServerMsg.SEND_TO_HOME); cleanupGame(code); });
	socket.on(ServerRequest.CLEANUP_SOCKET, (code: string) => { cleanupPlayerSocket(code, socket); })
}

/**
 * Removes disconnected player from their game, purging game object if necessary
 * @param socketID ID of player to remove
 * @param reason for logging purposes only
 * @param code if this is supplied, we know the user intended to leave the game
 * @param name if this is supplied, the host kicked this player out intentionally. TODO: in this case, should we not let them reconnect?
 * @returns void
 */
function onPlayerDisconnect(socket: Socket, reason: string, code: string = null, name: string = null): void {
	log(LogLevel.DEBUG, code, `Player with ID ${socket.data.id} disconnected because of ${reason}`);
	let game: SaboteurRockGame;
	if (code) { game = getGameFromCode(code); }
	// TODO: is there a faster way to find the game from the player without the game code?
	else { game = Array.from(activeGames.values()).find((game) => game.players.concat(game.displays).find((player) => player.socketID == socket.data.id)); }

	if (!game) { return; } // nothing to do

	// update game properties
	let player = game.removePlayer(name ?? socket.data.id);
	updateRequiredRooms(game);
	if (game.players.length == 0) {
		// cleanup game if all players are gone
		cleanupGame(game.code);
	} else if (player) {
		if (player.isDead || reason === "leaving via button") { // dead players are assumed to not reconnect
			// don't delete player imgs until the end of the game - unless they're dead or left intentionally
			console.log('deleting image for', player.name);
			deletePlayerImg(game.code, player.name);
		} else if (!game.custom || game.state != GamePhase.PREGAME) { // for custom games, allow players to redo their selection in pregame
			game.disconnected.push(player);
		}
		let newHost = null;
		if (player.isHost) {
			// reassign host duties
			game.players[0].isHost = true;
			newHost = game.players[0];
		}
		// don't need to notify when the display player leaves
		if (!player.isDisplay) {
			emitToGame(game.code, ServerMsg.REMOVE_PLAYER, game, player, newHost);
		}
		// find the kicked player's socket and disconnect that one instead of the socket that made the request
		if (name) {
			for (let el of io.sockets.sockets.values()) {
				if (el.data?.id == player.socketID) {
					socket = el;
				}
			}
		}
		cleanupPlayerSocket(game.code, socket);
	}
}

/**
 * Creates a new game instance, adding the host(creator) to the game
 * @param socket player(host) to emit response back to
 * @param playerName name of host player
 * @param avatar player avatar
 */
function onCreateGame(socket: Socket, playerName: string, avatar: Uint8Array, custom: boolean): void {
	let game = createGameInstance(custom);
	let player = addPlayer(game, playerName, socket.data.id);
	addPlayerSocket(game.code, socket);
	storePlayerImg(game.code, playerName, avatar);
	let avatars = getPlayerImgs(game.code);
	// send message back only to the host
	socket.emit(ServerMsg.ADD_PLAYER, game, player, avatars);
}

/**
 * Returns true if a game with the given code exists, false otherwise
 * @param code game to check
 * @returns if game exists
 */
function checkIfGameExists(code: string): boolean {
	return activeGames.get(code) !== undefined;
}

/**
 * Joins a game as a display player, emits to non-display players solely to update the game object
 * @param socket display player socket object
 * @param code game to join
 */
function joinAsDisplay(socket: Socket, code: string): void {
	let game = getGameFromCode(code);
	if (!game) {
		socket.emit(ServerMsg.ERROR, ServerError.GAME_NOT_FOUND);
	} else if (game.state != GamePhase.PREGAME) {
		socket.emit(ServerMsg.ERROR, ServerError.GAME_STARTED);
	} else {
		let player = addDisplayPlayer(game, socket.data.id);
		addPlayerSocket(code, socket);
		let avatars = getPlayerImgs(code);
		// notify only the display - as far as the rest of the players are concerned, the display is a dummy player
		socket.emit(ServerMsg.ADD_PLAYER, game, player, avatars);
		emitToGame(code, ServerMsg.PLAYER_JOIN, game, DUMMY_PLAYER_NAME, false, null, true);
	}
}

/**
 * Joins a custom game, assigning the player the role they input
 * @param socket player socket object
 * @param customPlayer role information input by player
 * @param code game to join
 * @param playerName player name
 */
function joinCustomGame(socket: Socket, customPlayer: CustomPlayer, code: string, playerName: string) {
	let game = getGameFromCode(code);
	let role: Role = getRoleFromName(customPlayer.role);
	// assign role on join, since we are skipping the random assigning and marooning
	let player = game.players.find((player) => player.name == playerName);
	player.assignRole(role);
	switch (customPlayer.role) {
		case RoleName.DETECTIVE:
			game.detectiveCard = customPlayer.graveyardCard;
			break;
		case RoleName.GHOST:
			let ghostRole = getRoleFromName(customPlayer.graveyardCard);
			player.role.ability = ghostRole.ability;
			player.role.description = ghostRole.description;
			player.role.prompt = ghostRole.prompt;
			player.role.withhold = ghostRole.withhold;
			if (ghostRole.ability == RoleName.PRESIDENT) { game.usedVeto = customPlayer.usedAbility; }
			if (ghostRole.ability == RoleName.EXECUTIONER) { game.usedKill = customPlayer.usedAbility; }
			break;
		case RoleName.PRESIDENT:
			game.usedVeto = customPlayer.usedAbility;
			break;
		case RoleName.EXECUTIONER:
			game.usedKill = customPlayer.usedAbility;
			break;
		case RoleName.MEDIC:
			game.disableSos = customPlayer.usedAbility;
			game.lastUsedSos = new Player(customPlayer.sos, -1, false);
			break;
	}
	// required rooms, avatars, etc have already been handled
	socket.emit(ServerMsg.ADD_PLAYER, game, player, undefined);
	// emit to all players (new player essentially ignores this)
	emitToGame(code, ServerMsg.PLAYER_JOIN, game, player.name, player.isHost, { name: player.name, img: undefined }, false);
}

/**
 * Adds a new player to an existing game
 * If player disconnected, this function handles reconnecting them as well
 * @param socket new player to emit response back to
 * @param code game code
 * @param playerName name of new player
 * @param avatar player avatar
 */
function onAddPlayer(socket: Socket, code: string, playerName: string, avatar: Uint8Array): void {
	let game = getGameFromCode(code);
	if (!game) {
		socket.emit(ServerMsg.ERROR, ServerError.GAME_NOT_FOUND);
	} else if (playerName.toLowerCase() == DUMMY_PLAYER_NAME || game.players.find((player) => player.name.toLowerCase() == playerName.toLowerCase())) {
		socket.emit(ServerMsg.ERROR, ServerError.DUPLICATE_PLAYER);
	} else if (game.players.length >= 14) {
		socket.emit(ServerMsg.ERROR, ServerError.MAX_PLAYERS);
	} else {
		let player: Player;
		if (game.disconnected.find((player) => player.name.toLowerCase() == playerName.toLowerCase())) {
			// player disconnected and needs to reconnect
			player = game.reconnectPlayer(playerName, socket.data.id);
		} else {
			// player wasn't disconnected and is newly joining
			if (game.state == GamePhase.PREGAME) {
				player = addPlayer(game, playerName, socket.data.id);
			} else {
				socket.emit(ServerMsg.ERROR, ServerError.GAME_STARTED);
				return;
			}
		}
		addPlayerSocket(code, socket);
		if (avatar == null) { // if no image was supplied, check for an existing one
			let oldPlayerImg = getPlayerImg(code, player.name);
			if (oldPlayerImg) {
				// use an existing player image (if it exists) so we don't overwrite with a null img
				avatar = oldPlayerImg.img;
			}
		} else {
			storePlayerImg(code, player.name, avatar);
		}
		updateRequiredRooms(game);
		let avatars = getPlayerImgs(code);
		socket.emit(ServerMsg.ADD_PLAYER, game, player, avatars);
		// emit to all players (new player essentially ignores this)
		emitToGame(code, ServerMsg.PLAYER_JOIN, game, player.name, player.isHost, { name: player.name, img: avatar }, false);
	}
}

/**
 * Updates game options
 * @param code game to update
 * @param options changes to apply
 */
function onUpdateOptions(code: string, options: GameOptions): void {
	let game = getGameFromCode(code);
	if (game.state == GamePhase.PREGAME || game.state == GamePhase.MAROONING) { game.options = options; }
	else { game.updatedOptions = options; } // delay applying changes until next round
	emitToGame(code, ServerMsg.UPDATE_OPTIONS, game);
}


/**
 * Triggers the start of a game. If the game is custom, handles populating necessary information and starting round 1. Otherwise, assigns players a role
 * @param code game to start
 */
function onGameStart(code: string): void {
	let game = getGameFromCode(code);
	// can skip role assignment, marooning, role display & generate round one in a custom game
	// just populate team metrics
	if (game.custom) {
		let distribution = ROLE_DISTRIBUTION[game.players.length];
		game.detectiveCard = RoleName[game.graveyard[randomInt(game.graveyard.length)]];

		// if President is not in the game, Turncoat is automatically a stowaway
		if (!game.players.find((player) => player.role.ability == RoleName.PRESIDENT)) {
			let turncoat = game.players.find((player) => player.role.ability == RoleName.TURNCOAT);
			if (turncoat) { turncoat.role.team = Team.STOWAWAYS; }
		}

		game.teamMetrics = { numPassengers: distribution['numPassengers'], numStowaways: distribution['numStowaways'] };
		game.passengers = game.players.filter((player) => player.socketID != -1 && player.role?.team == Team.PASSENGERS);
		game.stowaways = game.players.filter((player) => player.socketID != -1 && player.role?.team == Team.STOWAWAYS);

		onGenerateRound(code);
	} else {
		onAssignRoles(code);
	}
}

/**
 * Randomly assigns player roles at the start of the game
 * @param code game code
 */
function onAssignRoles(code: string): void {
	let game = getGameFromCode(code);
	assignPlayerRoles(game);
	game.state = GamePhase.MAROONING;
	let marooningAudio: MarooningAudio = MAROONING_AUDIO[game.options.marooningScript];
	emitToGame(code, ServerMsg.ASSIGN_ROLES, game, marooningAudio.audioSrc);
}

/**
 * Triggers the marooning phase, handling timeouts for ghost and detective
 * @param code game code
 */
function onMarooningStart(code: string): void {
	let game = getGameFromCode(code);
	let marooningAudio: MarooningAudio = MAROONING_AUDIO[game.options.marooningScript];
	emitToGame(code, ServerMsg.BEGIN_MAROONING);

	let ghostStart = setTimeout(() => {
		// emit to ghost to show cards
		emitToGame(code, ServerMsg.MAROONING_ABILITY, RoleName.GHOST, true);
		clearInterval(timerMappings.get(game.code));
		let ghostEnd = setTimeout(() => {
			// emit to ghost to hide cards
			emitToGame(code, ServerMsg.MAROONING_ABILITY, RoleName.GHOST, false);
			clearInterval(timerMappings.get(game.code));
			let detectiveStart = setTimeout(() => {
				// emit to detective to show cards
				emitToGame(code, ServerMsg.MAROONING_ABILITY, RoleName.DETECTIVE, true);
				clearInterval(timerMappings.get(game.code));
				let detectiveEnd = setTimeout(() => {
					// emit to detective to hide cards
					emitToGame(code, ServerMsg.MAROONING_ABILITY, RoleName.DETECTIVE, false);
					clearInterval(timerMappings.get(game.code));
					timerMappings.set(game.code, undefined);
				}, marooningAudio.detectiveEnd);
				timerMappings.set(game.code, detectiveEnd);
			}, marooningAudio.detectiveStart);
			timerMappings.set(game.code, detectiveStart);
		}, marooningAudio.ghostEnd);
		timerMappings.set(game.code, ghostEnd);
	}, marooningAudio.ghostStart);
	timerMappings.set(game.code, ghostStart);
}

/**
 * Generates a new round of meetings for a given game
 * @param code game code
 */
function onGenerateRound(code: string): void {
	let game = getGameFromCode(code);
	// process vote results (if applicable) before generating another round
	if (!game.voteResults[game.roundIndex]?.veto && (game.roundIndex > 0 || (game.roundIndex == 0 && game.options.roundOneElimination))) {
		doPlayerElimination(false, game);
	}
	// apply any options changes, if applicable
	if (game.updatedOptions) {
		game.options = game.updatedOptions;
		game.updatedOptions = null;
	}
	generateRound(game);
	game.countdown = -1; // reset for display player
	emitToGame(code, ServerMsg.GEN_ROUND, game);
}

/**
 * Sends a signal to begin a meeting round
 * Emits the updated countdown and game state
 * @param code game code
 */
function onRoundStart(code: string): void {
	let game = getGameFromCode(code);
	// delete timer just in case
	clearInterval(timerMappings.get(game.code));
	timerMappings.set(game.code, undefined);
	game.countdown = game.options.transitionDur;
	game.state = GamePhase.TRANSITION;
	doRoundTimer(code);
	emitToGame(code, ServerMsg.ROUND_START, game.countdown, game.state);
}

/**
 * Handles timers for transitions and meetings, notifying players once the timers are up
 * Emits the new game state, countdown, and deliberation index
 * @param code game code
 */
function doRoundTimer(code: string): void {
	let game = getGameFromCode(code);
	let timer = setInterval(() => {
		if (game.countdown <= 0) {
			switch (game.state) {
				case GamePhase.TRANSITION:
					game.state = GamePhase.MEETING;
					game.countdown = game.options.meetingDur;
					break;
				case GamePhase.MEETING:
					if (game.deliberationIndex == game.rounds[game.roundIndex].length - 1) {
						game.state = GamePhase.PREVOTE;
						clearInterval(timerMappings.get(game.code));
						timerMappings.set(game.code, undefined);
					} else {
						game.state = GamePhase.TRANSITION;
						game.countdown = game.options.transitionDur;
						game.deliberationIndex++;
					}
					break;
				default:
					throw new Error(`[stopTimer] invalid game state: ${GamePhase[game.state]}`);
			}
			emitToGame(game.code, ServerMsg.TIMER_END, game.state, game.countdown, game.deliberationIndex);
		} else {
			game.countdown--;
			emitToGame(game.code, ServerMsg.TIMER_DECREMENT, game.countdown);
		}
	}, 1000);
	timerMappings.set(game.code, timer);
}

/**
 * Sends notification to toggle timer running/paused to all players
 * @param code game code
 */
function onTimerToggle(code: string): void {
	let game = getGameFromCode(code);
	if (game.doTimer) {
		clearInterval(timerMappings.get(game.code));
		timerMappings.set(game.code, undefined);
		game.doTimer = false;
	} else {
		doRoundTimer(code);
		game.doTimer = true;
	}
	emitToGame(code, ServerMsg.TIMER_TOGGLE, game.doTimer);
}

/**
 * Opens voting, booting disconnected players out if there are any, as they are assumed to have left completely
 * @param code game code
 * @param disconnected list of disconnected players
 */
function sendToVoting(code: string, disconnected: number): void {
	let game = getGameFromCode(code);
	game.votable = [...game.players].filter((player) => player.socketID != -1);
	game.state = GamePhase.VOTE;
	if (disconnected == 0) { game.disconnected = []; }
	emitToGame(code, ServerMsg.SEND_TO_VOTING, game);
}

/**
 * Collects votes, processing once all votes are cast
 * @param code game code
 * @param vote object containing who cast the vote, who the target is, and who the owner uses their ability (if applicable) on
 */
function onCastVote(code: string, vote: Vote): void {
	let game = getGameFromCode(code);
	if (!game.voteRounds[game.roundIndex]) { game.voteRounds.push([]); }
	game.voteRounds[game.roundIndex].push(vote);
	game.voted.push(vote.owner);
	// check if this vote was the last one. if so, notify players voting is complete
	if (game.voted.length == game.votable.length) {
		closeVoting(code, game.disconnected.length);
	} else { // if not, send the updated vote count (only the display player uses this)
		emitToGame(code, ServerMsg.VOTE_CT, game);
	}
}

/**
 * Closes voting, booting disconnected players out if there are any, as they are assumed to have left completely
 * @param code game code
 * @param disconnected list of disconnected players
 */
function closeVoting(code: string, disconnected: number): void {
	let game = getGameFromCode(code);
	if (disconnected == 0) { game.disconnected = []; }

	processVotingResults(game);

	if (game.voteResults[game.roundIndex].tie && game.voted.length != game.players.length) {
		game.voted = [];
		// shows results, and indicates there is a tie
		emitToGame(code, ServerMsg.TIEBREAK_START, game, true);
	}
	game.voted = [];

	// send message based on if we need to break a tie or not
	if (!game.voteResults[game.roundIndex].tie || game.voteResults[game.roundIndex].veto) {
		game.state = GamePhase.RESULTS;
		// shows complete results
		emitToGame(code, ServerMsg.VOTING_COMPLETE, game);
	} else {
		// shows results, and indicates there is a tie
		emitToGame(code, ServerMsg.TIEBREAK_START, game, false);
	}
}

/**
 * Opens tiebreak voting
 * @param code game code
 */
function sendToTiebreak(code: string): void {
	let game = getGameFromCode(code);
	game.state = GamePhase.VOTE;
	emitToGame(code, ServerMsg.SEND_TO_TIEBREAK, game);
}

/**
 * Collects tiebreaker votes, processing once all are cast. Only the Saboteur's vote actually counts
 * @param code game code
 * @param owner who cast the vote
 * @param target who the vote is for
 */
function onTiebreakVote(code: string, owner: Player, target: Player): void {
	let game = getGameFromCode(code);
	let roundResults = game.voteResults[game.roundIndex];
	game.voted.push(owner);
	if (owner.role.ability == RoleName.SABOTEUR) { roundResults.saboteurTiebreak = target; }
	if (game.voted.length == (game.players.length - game.containsDummy)) { // all votes are in
		roundResults.eliminated = roundResults.saboteurTiebreak;
		roundResults.tieResolved = true;
		game.voted = [];
		emitToGame(code, ServerMsg.VOTING_COMPLETE, game);
	} else {
		emitToGame(code, ServerMsg.VOTE_CT, game);
	}
}

/**
 * Triggered by host moving to 'Final Results' screen. Sends players to victory screen
 * @param code game code
 */
function processVictory(code: string): void {
	let game = getGameFromCode(code);
	doPlayerElimination(false, game)
	emitToGame(code, ServerMsg.VICTORY, game);
}

/**
 * @returns the next unique available socket ID
 */
function generatePlayerSocketID(): number {
	return nextID++;
}

/**
 * @param code game code
 * @returns the player avatars + metadata for that game
 */
function getPlayerImgs(code: string): PlayerImg[] {
	return avatarMappings.get(code);
}

/**
 * @param code game code
 * @returns the avatar + metadata for the specified player
 */
function getPlayerImg(code: string, name: string): PlayerImg {
	return avatarMappings.get(code).find((playerImg) => playerImg.name == name);
}

/**
 * Saves player's image to avatarMappings map in memory
 * Eventually, this will probably not scale well
 * @param code game code
 * @param playerName player's name
 * @param img player avatar as a Uint8Array
 */
function storePlayerImg(code: string, playerName: string, img: Uint8Array): void {
	if (avatarMappings.get(code) == undefined) {
		avatarMappings.set(code, []);
	}
	if (!img) { return; }
	const imgs = avatarMappings.get(code);
	if (imgs?.length) {
		imgs.push({ name: playerName, img: img });
		avatarMappings.set(code, imgs);
	} else {
		avatarMappings.set(code, [{ name: playerName, img: img }]);
	}
}

function deletePlayerImg(code: string, name: string): void {
	const imgs = avatarMappings.get(code);
	if (imgs?.length) { avatarMappings.set(code, imgs.filter((imgs) => { return imgs.name != name; })); }
}

function cleanupPlayerImgs(code: string): void {
	avatarMappings.set(code, []);
}

/**
 * Deletes player images & game object, cleans up socket.io room
 * @param code game code/room name
 */
function cleanupGame(code: string): void {
	log(LogLevel.VERBOSE, code, 'Cleaning up game', code, '...');
	cleanupPlayerImgs(code);
	activeGames.delete(code);
	log(LogLevel.VERBOSE, code, 'Done cleaning up game. Active games:', activeGames.size);
}

/**
 * Removes a player socket from a game room
 * @param code game code/room name
 * @param socket player socket
 */
function cleanupPlayerSocket(code: string, socket: Socket): void {
	socket.leave(code);
}
/**
 * Adds a player socket to a game room
 * @param code game code/room name
 * @param socket player socket
 */
function addPlayerSocket(code: string, socket: Socket): void {
	socket.join(code);
}

/**
 * Sends a message to clients, with type and arguments
 * @param code game code/room name
 * @param responseType message/notification type
 * @param args data to send to clients
 */
function emitToGame(code: string, responseType: ServerMsg, ...args: any[]): void {
	log(LogLevel.VERBOSE, code, `Sending ${responseType}`, args);
	io.to(code).emit(responseType, ...args);
}

/**
 * Retrieves a game instance given a code
 * @param code game to find
 * @returns the found game instance, or undefined if not found
 */
function getGameFromCode(code: string): SaboteurRockGame | undefined {
	return activeGames.get(code);
}

/**
 * Generates a game code for a new game instance
 * @returns the new code
 */
function generateGameCode(): string {
	let code = '';
	const gameCodeLength = 4;
	const characters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
	const charactersLength = characters.length;
	for (let counter = 0; counter < gameCodeLength; counter++) {
		code += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	// code = CODES[randomInt(CODES.length)]; // use pre-generated code
	if (checkIfGameExists(code)) {
		return generateGameCode();
	}
	// base case
	return code;
}

/**
 * Generates a game code and game instance
 * @returns the new game instance
 */
function createGameInstance(custom: boolean): SaboteurRockGame {
	let code = generateGameCode();
	log(LogLevel.VERBOSE, code, 'Creating game ' + code);
	let newGame = new SaboteurRockGame(code, custom);
	activeGames.set(code, newGame);
	return newGame;
}
