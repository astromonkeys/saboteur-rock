export enum GamePhase {
    PREGAME,
    MAROONING,
    MEETING,
    TRANSITION,
    PREVOTE,
    VOTE,
    RESULTS
}

export enum UIState {
    HOME,
    CREATE_SESSION,
    CUSTOM_SESSION,
    JOIN_SESSION,
    LOBBY,
    ROLE_DISPLAY, // display player only
    MAROONING,
    PRE_ROUND,
    ROUND_DISPLAY,
    VOTING,
    VOTE_RESULTS,
    VICTORY
}

export enum MarooningState {
    ROLE_DISPLAY,
    NORMAL,
    DETECTIVE,
    GHOST
}

export enum VoteState {
    BALLOT,
    ABILITY,
    WAIT,
    TIEBREAKER
}

export enum ResultState {
    ABILITY,
    ELIMINATED,
    SUMMARY
}

export class GameOptions {
    meetingDur: number = DEFAULT_MEETING_DURATION;
    transitionDur: number = DEFAULT_TRANSITION_DURATION;
    rooms: string[] = ["", "", "", "", "", "", ""]; // default to 8 players/4 rooms - can add more if necessary
    requiredRooms: number = 1; // number of rooms required
    marooningScript: string = "Standard";
    roundOneElimination: boolean = false;
}

export const DEFAULT_MEETING_DURATION: number = 30; // meeting length, in seconds - default to 30
export const DEFAULT_TRANSITION_DURATION: number = 15; // transition period length, in seconds - default to 15

export class Meeting {

    constructor(
        public playerOne: Player,
        public playerTwo: Player,
        public room: string
    ) { }

    toString(): string {
        return `${this.playerOne?.name ?? 'nobody'} and ${this.playerTwo?.name ?? 'nobody'} meet in the ${this.room}`;
    }
}

export class Vote {
    owner: Player | undefined;
    target: Player | undefined;
    abilityTarget?: Player;
    presidentVeto?: number = 0;
}

export class VoteResults {
    professorSaboteur: boolean = false; // did the professor vote with the saboteur?
    veto: boolean = false; // did the president use their veto?
    votes: [Player, number][] = [];
    executed?: Player; // player that was executed, if any
    sos?: Player; // player that was saved usding the SoS, if any
    silenced?: Player; // player that was silenced, if any
    eliminated: Player | undefined; // player that was eliminated (by vote) this round - they may still be saved
    tie: boolean = false; 
    tieResolved: boolean = true;
    firstPlace: Player[] = []; // store all tied players here. length = 1 if no tie
    saboteurTiebreak?: Player;
    tiebreakerCt: number = 0;
}

export class Player {
    avatarPath: string = "";
    isDisplay: boolean = false;
    isDead: boolean = false;
    role: Role | null = null;

    assignRole(role: Role): Player {
        this.role = role;
        return this;
    }

    // socketID is used to uniquely identify and compare Players
    constructor(
        public name: string,
        public socketID: number,
        public isHost: boolean = false
    ) { }
}

export interface Role {
    name: RoleName, // Captain, Medic, Turncoat, etc.
    team: Team, // either Team.STOWAWAYS or Team.PASSENGERS
    ability: RoleName, // same as name, except for ghost
    description: string[], // role description, list of lines of text
    card: string, // text on game card
    tip: string, // Luca's tip - nice
    prompt: string, // ability prompt text
    withhold: string // withhold ability text
}

export enum RoleName {
    // Passengers
    PASSENGER = "Passenger",
    CAPTAIN = "Captain",
    MEDIC = "Medic",
    PROFESSOR = "Professor",
    DETECTIVE = "Detective",
    PRESIDENT = "President",
    TURNCOAT = "Turncoat",
    // Stowaways
    SABOTEUR = "Saboteur",
    ACCOMPLICE = "Accomplice",
    EXECUTIONER = "Executioner",
    SILENCER = "Silencer",
    GHOST = "Ghost"
}

export enum Team {
    STOWAWAYS = "Stowaways",
    PASSENGERS = "Passengers"
}

export const RoleTeamMap = new Map<RoleName, Team>([
    [RoleName.PASSENGER, Team.PASSENGERS],
    [RoleName.CAPTAIN, Team.PASSENGERS],
    [RoleName.MEDIC, Team.PASSENGERS],
    [RoleName.PROFESSOR, Team.PASSENGERS],
    [RoleName.DETECTIVE, Team.PASSENGERS],
    [RoleName.PRESIDENT, Team.PASSENGERS],
    [RoleName.TURNCOAT, Team.PASSENGERS],
    [RoleName.SABOTEUR, Team.STOWAWAYS],
    [RoleName.ACCOMPLICE, Team.STOWAWAYS],
    [RoleName.EXECUTIONER, Team.STOWAWAYS],
    [RoleName.SILENCER, Team.STOWAWAYS],
    [RoleName.GHOST, Team.STOWAWAYS]
])

// abilities the player doesn't need to make an active selection for each turn
export const PASSIVE_ROLES = [
    RoleName.PASSENGER,
    RoleName.PROFESSOR,
    RoleName.DETECTIVE,
    RoleName.TURNCOAT,
    RoleName.SABOTEUR,
    RoleName.ACCOMPLICE
];

export enum ServerRequest {
    CONNECT = "connection",
    DISCONNECT = "disconnect",
    CREATE_GAME = "generateGame",
    JOIN_CUSTOM_GAME = "joinCustomGame",
    GAME_EXISTS = "gameExists",
    DISPLAY_JOIN = "joinAsDisplay",
    ADD_PLAYER = "addPlayer",
    PLAYER_LEAVE = "playerLeave",
    UPDATE_OPTIONS = "updateOptions",
    GAME_START = "startGame",
    BEGIN_MAROONING = "beginMarooning",
    END_MAROONING = "endMarooning",
    GEN_ROUND = "generateRound",
    ROUND_START = "roundStart",
    TIMER_TOGGLE = "toggleTimer",
    SEND_TO_VOTING = "sendToVoting",
    CAST_VOTE = "castVote",
    CLOSE_VOTING = "closeVoting",
    SEND_TO_TIEBREAK = "startTiebreak",
    TIEBREAK_VOTE = "tiebreakVoteReceived",
    VICTORY = "victory",
    SEND_TO_HOME = "sendHome",
    CLEANUP_SOCKET = "cleanupSocket"
}

export enum ServerMsg {
    ERROR = "errorResponse",
    ADD_PLAYER = "addPlayerResponse",
    PLAYER_JOIN = "playerJoinResponse",
    REMOVE_PLAYER = "removePlayerResponse",
    UPDATE_OPTIONS = "updateOptionsResponse",
    ASSIGN_ROLES = "assignRolesResponse",
    BEGIN_MAROONING = "beginMarooningResponse",
    MAROONING_ABILITY = "marooningAbilityNotification",
    END_MAROONING = "endMarooningResponse",
    GEN_ROUND = "generateRoundResponse",
    ROUND_START = "roundStartResponse",
    TIMER_DECREMENT = "timerDecrementResponse",
    TIMER_TOGGLE = "toggleTimerResponse",
    TIMER_END = "endTimerResponse",
    SEND_TO_VOTING = "sendToVotingResponse",
    VOTE_CT = "voteCountResponse",
    VOTING_COMPLETE = "votingCompleteResponse",
    TIEBREAK_START = "tiebreakInitResponse",
    SEND_TO_TIEBREAK = "startTiebreakResponse",
    VICTORY = "victoryResponse",
    SEND_TO_HOME = "sendHomeResponse",
}

export enum ServerError {
    GAME_NOT_FOUND,
    DUPLICATE_PLAYER,
    MAX_PLAYERS,
    GAME_STARTED
}

export const DUMMY_PLAYER_NAME: string = 'nobody';
export const DEFAULT_AVATAR_PATH: string = 'client/assets/icons/profile_empty.svg';
export const DEAD_AVATAR_PATH: string = 'client/assets/icons/profile_dead.svg';

// Holds all data to manage an active game. Copies are stored both in the UI and server, staying in sync via api calls/responses
export class SaboteurRockGame {
    code: string; // 4-letter game code
    custom: boolean; // is custom game or not
    // name: string;
    options: GameOptions = new GameOptions();
    updatedOptions: GameOptions | null = null;
    teamMetrics: TeamMetrics | null = null;

    players: Player[] = []; // updated dynamically based on players joining and leaving
    votable: Player[] = []; // static list, refreshed at round generation. used to display vote candidates

    // used to keep track of who's who at the beginning of the game
    passengers: Player[] = [];
    stowaways: Player[] = [];
    removePlayer(socketIDOrName: number | string): Player | null {
        let player: Player | undefined;
        if (typeof socketIDOrName === "number") {
            player = this.players.find((player) => player.socketID == socketIDOrName);
        }
        if (typeof socketIDOrName === "string") {
            player = this.players.find((player) => player.name == socketIDOrName);
        }
        if (!player) { return null; }
        let index = this.players.indexOf(player);
        if (index > -1) {
            player = this.players.splice(index, 1)[0];
        } else { return null; }

        // If there is just one player left, and they're a dummy, remove them too
        if (this.players.length == 1 && this.players[0].name == DUMMY_PLAYER_NAME) {
            this.players = [];
        }
        return player;
    }
    addPlayer(player: Player): Player {
        this.players.push(player);
        return player;
    }
    reconnectPlayer(name: string, newID: number): Player | null{
        let player = this.disconnected.find((player) => player.name.toLowerCase() == name.toLowerCase());
        if (!player) { return null; }
        let index = this.disconnected.indexOf(player);
        if (index > -1) {
            player = this.disconnected.splice(index, 1)[0];
            player.socketID = newID;
            if (player.isHost) { this.players.forEach((player) => player.isHost = false); }
            if (!player.isDead) { this.players.push(player); }
            else { this.dead.push(player); }
            return player;
        } else { return null; }
    }
    get containsDummy(): number { return this.players.find((player) => player.name == DUMMY_PLAYER_NAME) ? 1 : 0; }

    disconnected: Player[] = [];
    displays: Player[] = []; // these are not actual 'players', but for display purposes, like a TV or laptop
    dead: Player[] = [];

    graveyard: string[] = [];
    detectiveCard: string = ""; // card the detective sees, unused if there is no detective

    doTimer: boolean = true;
    countdown: number = -1; // tracks the countdown of the current game phase(transition, meeting)
    state: GamePhase = GamePhase.PREGAME; // which countdown timer should we use?

    roundIndex: number = -1; // which round are we on? init to -1 since it is incremented before being used
    deliberationIndex: number = 0; // which deliberation are we on in the current round?
    rounds: Meeting[][][] = []; // array of rounds, which are an array of deliberations/tribunals, which are an array of meetings

    voteRounds: Vote[][] = [];
    voted: Player[] = []; // keeps track of who has already voted for the current round
    voteResults: VoteResults[] = []; // only store the results of the current round

    lastUsedSos: Player | null = null; // who was the SOS last used on?
    disableSos: boolean = false; // should we disable the medic's ability for one turn this round?
    usedVeto: boolean = false; // has the president used their veto yet?
    usedKill: boolean = false; // has the executioner used their kill yet?

    victory: Team | null = null;

    constructor(code: string, custom: boolean) {
        this.code = code;
        this.custom = custom;
    }

    // prints a human-readable summary/report of what happened during a game
    // json format? 
    toSummaryString(): string {
        return "[toSummaryString] TODO: implement";
    }
}

export interface TeamMetrics {
    numPassengers: number;
    numStowaways: number;
}

export interface MarooningAudio {
    name: string;
    audioSrc: string;
    // below values are in milliseconds
    ghostStart: number;
    ghostEnd: number;
    detectiveStart: number;
    detectiveEnd: number;
}

/* Possible Roles are defined in roles.json */
export class Role {
    constructor(
        public name: RoleName, // Captain, Medic, Turncoat, etc
        public team: Team, // either Team.STOWAWAYS or Team.PASSENGERS
        public ability: RoleName, // same as name, except for ghost
        public description: string[],
        public card: string,// card text
        public tip: string, // Luca's tip
        public prompt: string,
        public withhold: string
    ) { }
}

export interface PlayerImg {
    name: string;
    img: Uint8Array;
}

export interface CustomPlayer {
    role: RoleName;
    usedAbility?: boolean;
    graveyardCard?: RoleName;
    sos?: string;
}
