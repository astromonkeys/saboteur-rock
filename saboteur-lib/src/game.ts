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