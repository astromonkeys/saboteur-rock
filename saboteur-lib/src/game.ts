import { Player } from "./player";

export enum GamePhase {
    PREGAME,
    MAROONING,
    MEETING,
    TRANSITION,
    PREVOTE,
    VOTE,
    RESULTS
}

export class GameOptions {
    meetingDur: number = DEFAULT_MEETING_DURATION;
    transitionDur: number = DEFAULT_TRANSITION_DURATION;
    rooms: string[] = ["", "", "", "", "", "", ""]; // default to 8 players/4 rooms - can add more if necessary
    requiredRooms: number = 1; // number of rooms required
    marooningScript: string = "Standard";
    roundOneElimination: boolean = true;
}

export const DEFAULT_MEETING_DURATION: number = 30; // meeting length, in seconds - default to 30
export const DEFAULT_TRANSITION_DURATION: number = 30; // transition period length, in seconds - default to 30

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
    professorSaboteur: boolean = false;
    veto: boolean = false;
    votes: [Player, number][] = [];
    executed?: Player;
    sos?: Player;
    silenced?: Player;
    eliminated: Player | undefined;
    tie: boolean = false;
    tieResolved: boolean = true;
    firstPlace: Player[] = []; // store all tied players here. length = 1 if no tie
    saboteurTiebreak?: Player;
    tiebreakerCt: number = 0;
}