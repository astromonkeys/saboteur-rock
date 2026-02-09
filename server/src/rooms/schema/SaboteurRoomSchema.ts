import { Schema, type } from "@colyseus/schema";
import { GameOptions, Player, GamePhase, Meeting, Vote, VoteResults, Team,  } from "saboteur-lib";

export class GameState extends Schema {

    @type("string") code: string; // 4-letter game code unique to this room
    @type(GameOptions) options: GameOptions = new GameOptions();

    // updated dynamically based on players joining and leaving
    @type([Player]) players: Player[] = []; 
    @type([Player]) displays: Player[] = []; // these are not actual 'players', but for display purposes(ex. a TV or laptop)
  
    // static list refreshed at round generation. used to display vote candidates
    // kept in case player disconnects mid-round
    @type([Player]) votable: Player[] = []; 

    // used to keep track of who's who at the beginning of the game
    // unchanged after the game starts EXCEPT if/when the Turncoat changes teams
    @type([Player]) passengers: Player[] = [];
    @type([Player]) stowaways: Player[] = [];

    @type(["string"]) graveyard: string[] = [];
    @type("string") detectiveCard: string; // card the detective sees, unused if there is no detective

    @type("boolean") doTimer: boolean = true;
    @type("number") countdown: number = -1; // tracks the countdown of the current game phase(transition, meeting)
    @type(GamePhase) phase: typeof GamePhase = GamePhase.PREGAME; // which countdown timer should we use?

    @type("number") roundIndex: number = -1; // which round are we on? init to -1 since it is incremented before being used
    @type("number") deliberationIndex: number = 0; // which deliberation are we on in the current round?
    @type([[[Meeting]]]) rounds: Meeting[][][] = []; // array of rounds, which are an array of deliberations/tribunals, which are an array of meetings

    @type([[Vote]]) voteRounds: Vote[][] = [];
    @type([Player]) voted: Player[] = []; // keeps track of who has already voted for the current round
    @type([VoteResults]) voteResults: VoteResults[] = []; // only store the results of the current round

    @type(Player) lastUsedSos: Player; // who was the SOS last used on?
    @type("boolean") disableSos: boolean = false; // should we disable the medic's ability for one turn this round?
    @type("boolean") usedVeto: boolean = false; // has the president used their veto yet?
    @type("boolean") usedKill: boolean = false; // has the executioner used their kill yet?

    @type(Team) victory: typeof Team = null;

    // TODO: I don't want these
    // @type("boolean") custom: boolean; // is custom game or not
    // @type("string") name: string;

    // TODO: I think Colyseus makes these obsolete
    // updatedOptions: GameOptions = null;
    // disconnected: Player[] = [];
    // doTimer: boolean = true;
}
