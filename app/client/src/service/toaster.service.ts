import { Injectable, Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BackendService } from './backend.service';
import { MaterialModule } from '../material/material.module';
import { Player, RoleName, RoleTeamMap, Team, TeamMetrics } from 'saboteur-lib';
import { ResourceService } from './resource.service';
import { TypeService } from './type.service';
import { StateService } from './state.service';

export enum DialogType {
  AdminDialog,
  LeaveGameDialog,
  OpenVoteDialog,
  CloseVoteDialog,
  TipDialog,
  Wiki
}

@Injectable({
  providedIn: 'root'
})
export class ToasterService {

  constructor(
    private matDialog: MatDialog,
    private snackbar: MatSnackBar
  ) { }

  dialog(type: DialogType): void {
    switch (type) {
      case DialogType.AdminDialog:
        this.matDialog.open(AdminDialog, {});
        break;
      case DialogType.LeaveGameDialog:
        this.matDialog.open(LeaveGameDialog, {});
        break;
      case DialogType.OpenVoteDialog:
        this.matDialog.open(OpenVoteDialog, {});
        break;
      case DialogType.CloseVoteDialog:
        this.matDialog.open(CloseVoteDialog, {});
        break;
      case DialogType.TipDialog:
        this.matDialog.open(TipDialog, {});
        break;
      case DialogType.Wiki:
        this.matDialog.open(WikiDialog, {});
        break;
      default:
        break;
    }
  }

  toast(msg: string, duration: number) {
    this.snackbar.open(msg, null, {
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      duration: duration
    });
  }
}

@Component({
  selector: 'leave-game-dialog',
  template: `
  <div mat-dialog-content>
    <p style="color: black;">Are you sure you want to exit the game?</p>
  </div>
  <div mat-dialog-actions align="center">
    <button mat-stroked-button (click)="onNoClick()"> No </button>
    <button mat-stroked-button (click)="backend.sendToLobby()" [mat-dialog-close]="yes" cdkFocusInitial color="warn"> Yes </button>
  </div>
  `,
  standalone: true,
  imports: [MaterialModule]
})
export class LeaveGameDialog {

  yes: string = "yes";

  constructor(
    public backend: BackendService,
    public dialogRef: MatDialogRef<TipDialog>,
  ) { }

  onNoClick(): void {
    this.dialogRef.close("no");
  }
}

@Component({
  selector: 'open-vote-dialog',
  template: `
  <div mat-dialog-content>
    <p style="color: black;">{{msg}}</p>
    @for (player of backend.game.disconnected; track player.name) {
      <p>{{player.name}}</p>
    }
    <p style="color: black;">Are you sure you want to continue to voting?</p>
  </div>
  <div mat-dialog-actions align="center">
    <button mat-stroked-button (click)="onNoClick()"> No </button>
    <button mat-stroked-button (click)="backend.openVoting()" [mat-dialog-close]="yes" cdkFocusInitial color="warn"> Yes </button>
  </div>
  `,
  standalone: true,
  imports: [MaterialModule],
})
export class OpenVoteDialog {

  yes: string = "yes";

  constructor(
    public backend: BackendService,
    public dialogRef: MatDialogRef<OpenVoteDialog>,
  ) { }

  get msg(): string {
    return this.backend.game.disconnected.length > 1 ? `There are disconnected players:` : `There is a disconnected player:`;
  }

  onNoClick(): void {
    this.dialogRef.close('no');
  }
}

@Component({
  selector: 'wiki-dialog',
  template: `
  <h2 mat-dialog-title style="font-family: 'Lexend', sans-serif; font-size: larger;"><b>Game Reference</b></h2>
  <mat-divider></mat-divider>
  <div mat-dialog-content>
    @if (metrics) {
      <div>
        <p> In a {{metrics.numPassengers + metrics.numStowaways + 1}} player game, there are: </p> <!-- add 1 since the Saboteur's role is assigned differently than the other Stowaways -->
        <p [ngStyle]="{'color': res.passengerBlue}"> {{metrics.numPassengers}} <b style="color: rgba(0, 0, 0, 0.6); "> Passengers </b></p>
        <p [ngStyle]="{'color': res.stowawayOrange}"> {{metrics.numStowaways + 1}} <b style="color: rgba(0, 0, 0, 0.6); "> Stowaways </b></p>
        <mat-divider></mat-divider>
      </div>
    }
    <div>
      @for (role of roleNames; track role) {
        <p><b [ngStyle]="{'color': getRoleColor(role)}">{{role}}</b>: {{res.getCardDescription(role)}}</p>
      }
    </div>
    <mat-divider></mat-divider>
    <p style="color: black; "> For more detailed game information, go to <a class="link" (click)="openSite()">www.saboteurrock.com</a>.</p>
  </div>
  <div mat-dialog-actions align="center">
    <button mat-stroked-button (click)="onNoClick()"> Close </button>
  </div>
  `,
  standalone: true,
  imports: [MaterialModule],
})
export class WikiDialog {

  yes: string = "yes";

  get metrics(): TeamMetrics { return this.backend.game.teamMetrics; }
  get roleNames(): RoleName[] { return Object.values(RoleName); }

  constructor(
    public backend: BackendService,
    public res: ResourceService,
    public dialogRef: MatDialogRef<OpenVoteDialog>,
  ) { }

  getRoleColor(role: RoleName): string {
    if (role == RoleName.TURNCOAT) { return this.res.turncoatPurple; }
    return RoleTeamMap.get(role) == Team.PASSENGERS ? this.res.passengerBlue : this.res.stowawayOrange;
  }

  openSite() {
    window.open(this.res.saboteurRockSite, '_blank').focus();
  }

  onNoClick(): void {
    this.dialogRef.close('no');
  }
}

@Component({
  selector: 'tip-dialog',
  template: `
  <h1 mat-dialog-title style="font-family: 'Lexend', sans-serif; font-size: larger;"><b>{{backend.DEBUG_MODE ? backend.player.role.name + '(' + backend.player.name + ')' : backend.player.role.name }}</b></h1>
  <h2 mat-dialog-title style="color: black; font-family: 'Lexend', sans-serif; margin-top: -20px;"><b>Allegiance: {{backend.player.role.team}}</b></h2>
  <mat-divider></mat-divider>
  <div mat-dialog-content>
    <p style="color: black;">{{backend.player.role.card}}</p>
    @if (backend.player.role.team == types.Team.STOWAWAYS && ss.uiState != types.UIState.LOBBY) {
      <div>
        <p style="color: black;">The other Stowaways are:</p>
        @for (player of backend.game.stowaways; track player.name) {
          <p>{{stowawayString(player)}}</p>
        }
      </div>
    }
    @if (backend.player.role.name == types.RoleName.GHOST && backend.player.role.ability == types.RoleName.DETECTIVE) {
      <p style="color: black;">
        As a reminder, the role you assumed from the graveyard was the&nbsp;<b>{{backend.player.role.ability}}</b>. The card you saw from the graveyard (using the {{backend.player.role.ability}} ability) was the <b>{{backend.game.detectiveCard}}</b>
      </p>
    }
    @if (backend.player.role.name == types.RoleName.GHOST && backend.player.role.ability != types.RoleName.DETECTIVE) {
      <p style="color: black;">
        As a reminder, the role you assumed from the graveyard was the <b>{{backend.player.role.ability}}</b>
      </p>
    }
    @if (backend.player.role.name == types.RoleName.DETECTIVE) {
      <p style="color: black;">
        As a reminder, the card you saw from the graveyard was the <b>{{backend.game.detectiveCard}}</b>
      </p>
    }
    @if (backend.player.role.ability == types.RoleName.TURNCOAT) {
      <p style="color: black;">
        As a reminder, the president{{president?.isDead ? ' was ' : ' is '}}<b>{{president?.name ?? ' not in the game'}}</b>
      </p>
    }
    <p style="color: black;">{{backend.player.role.tip}}</p>
  </div>
  <div mat-dialog-actions align="center">
    <button mat-stroked-button (click)="onNoClick()"> Close </button>
  </div>
  `,
  standalone: true,
  imports: [MaterialModule],
})
export class TipDialog {

  stowawayString(player: Player): string {
    return player.role.ability == RoleName.SABOTEUR ? player.name + " (Saboteur)" : player.name;
  }

  get president(): Player | undefined {
    return this.backend.game.players.find((player) => player.role.ability == RoleName.PRESIDENT);
  }

  constructor(
    public backend: BackendService,
    public dialogRef: MatDialogRef<TipDialog>,
    public types: TypeService,
    public ss: StateService
  ) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'close-vote-dialog',
  template: `
  <div mat-dialog-content>
    <p style="color: black;">{{msg}}</p>
    @for (player of uncounted; track player.name) {
      <p>{{player.name}}</p>
    }
    <p style="color: black;">Are you sure you want to close voting?</p>
  </div>
  <div mat-dialog-actions align="center">
    <button mat-stroked-button (click)="onNoClick()"> No </button>
    <button mat-stroked-button (click)="backend.closeVoting()" [mat-dialog-close]="yes" cdkFocusInitial color="warn"> Yes </button>
  </div>
  `,
  standalone: true,
  imports: [MaterialModule]
})
export class CloseVoteDialog {

  yes: string = "yes";

  get uncounted(): Player[] {
    // takes a tiebreaker into account
    return this.backend.game.votable.filter((one) =>
      this.backend.game.voted.find((two) => one.name == two.name) == undefined
    );
  }

  get msg(): string {
    return this.uncounted.length > 1 ? `There are ${this.uncounted.length} players who haven\'t voted:` : `There is 1 player who hasn\'t voted:`;
  }

  constructor(
    public backend: BackendService,
    public dialogRef: MatDialogRef<TipDialog>,
  ) { }

  onNoClick(): void {
    this.dialogRef.close("no");
  }
}

@Component({
  selector: 'admin-dialog',
  template: `
  <div mat-dialog-content align="center">
    <div style="display: flex; align-items: center; justify-content: center;" (click)="restartRequested = false;">
      <div style="scale: 80%;">
        <mat-form-field>
          <mat-label>Select</mat-label>
          <mat-select [(ngModel)]="kickOut">
            @for (player of nonHosts; track player.name) {
              <mat-option [value]="player.name">{{player.name}}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <div style="margin-top: -17px;">
        <button mat-raised-button [disabled]="!kickOut" color="warn" (click)="backend.kickPlayer(kickOut)" color="primary"> Kick Player </button>
      </div>
    </div>
    <div>
      <button mat-stroked-button color="warn" (click)="requestRestart()"> Restart game </button>
    </div>
    @if(restartRequested) {
      <p style="color: black;"> Click again to confirm </p>
    }
  </div>
  <div mat-dialog-actions align="center">
    <button mat-stroked-button (click)="onNoClick()"> Close </button>
  </div>
  `,
  standalone: true,
  imports: [MaterialModule]
})
export class AdminDialog {

  yes: string = "yes";
  kickOut: string = "";
  restartRequested: boolean = false;

  get nonHosts(): Player[] {
    return this.backend.game?.players?.filter((player) => { return player.isHost == false });
  }

  constructor(
    public backend: BackendService,
    public dialogRef: MatDialogRef<AdminDialog>,
  ) { }

  requestRestart(): void {
    if (this.restartRequested) {
      this.onNoClick();
      this.backend.sendToLobby();
    } else {
      this.restartRequested = true;
    }
  }

  onNoClick(): void {
    this.dialogRef.close("no");
  }
}