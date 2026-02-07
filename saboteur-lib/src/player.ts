export class Player {
    avatarPath: string = "";
    isDisplay: boolean = false;
    isDead: boolean = false;
    role: Role | undefined;

    assignRole(role: Role): Player {
        this.role = role;
        return this;
    }

    constructor(
        public name: string,
        public isHost: boolean = false
    ) { }
}

export interface Role {
    name: RoleName, // Captain, Medic, Turncoat, etc
    team: Team, // either Team.STOWAWAYS or Team.PASSENGERS
    ability: RoleName, // same as name, except for ghost
    description: string[],
    card: string,// card text
    tip: string, // Luca's tip
    prompt: string,
    withhold: string
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