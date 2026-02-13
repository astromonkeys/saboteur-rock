import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../material/material.module';
import { NgxImageCompressService } from 'ngx-image-compress';
import { UIState, RoleName, Player, CustomPlayer, Role, DEFAULT_AVATAR_PATH } from 'saboteur-lib';
import { BackendService } from '../../service/backend.service';
import { StateService } from '../../service/state.service';
import { ResultComponent } from '../result/result.component';
import { VoteComponent } from '../vote/vote.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { VictoryComponent } from '../victory/victory.component';
import { ResultCardComponent } from '../result-card/result-card.component';
import { ResourceService } from '../../service/resource.service';
import { DialogType, ToasterService } from '../../service/toaster.service';
import { AudioService } from '../../service/audio.service';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { TypeService } from '../../service/type.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  standalone: true,
  imports: [MaterialModule, ResultComponent, VoteComponent, AvatarComponent, VictoryComponent],
  encapsulation: ViewEncapsulation.None
})
export class PlayerComponent {

  @ViewChild('home') home: ElementRef<HTMLDivElement>;
  @ViewChild('allegianceCard') allegianceCard: ElementRef<HTMLDivElement>;
  @ViewChild('displayCard') displayCard: ElementRef<HTMLImageElement>;
  @ViewChild('cardOne') cardOne: ElementRef<HTMLImageElement>;
  @ViewChild('cardTwo') cardTwo: ElementRef<HTMLImageElement>;
  @ViewChild('cardThree') cardThree: ElementRef<HTMLImageElement>;
  @ViewChild('audioToggle') audioToggle: MatSlideToggle;

  avatarSrc: string;
  customPlayer: CustomPlayer = { role: undefined, usedAbility: false, graveyardCard: undefined };
  showFileUploadError: boolean = false;
  cardFrontShowing: boolean = true;
  hideAllegiance: boolean = false;
  marooningStarted: boolean = false;

  get isTurncoat(): boolean {
    return this.backend.player.role.name == RoleName.TURNCOAT;
  }

  get bgOffset(): string {
    return `${Math.max(78 * Math.ceil(this.backend.game.players.length / 2) + 100, 0.7 * window.innerHeight)}px`;
  }

  disableCreate: boolean = false;
  disableJoin: boolean = false;

  constructor(
    public ss: StateService,
    public backend: BackendService,
    public res: ResourceService,
    public dialog: MatDialog,
    public toast: ToasterService,
    private compress: NgxImageCompressService,
    public audio: AudioService,
    public types: TypeService
  ) { };

  ngAfterViewInit() {
    this.avatarSrc = this.res.emptyAvatar;
    if (this.backend.DEBUG_MODE) { console.debug('Running app in debug mode.'); }
  }

  onCodeInput() {
    this.backend.enteredGameCode = this.backend.enteredGameCode.toUpperCase();
    this.backend.showGameCodeError = false;
    this.backend.showMaxPlayersError = false;
    this.backend.showGameStartedError = false;
  }

  uploadAvatar(): void {
    let imgUploadMsg: string;
    this.compress.uploadFile().then(({ image, orientation }) => {
      this.backend.showImgUploadModal = true;
      this.compress.compressFile(image, orientation, 100, 100, 150, 150).then(compressedImage => {
        this.avatarSrc = compressedImage;
        this.res.setAvatar(compressedImage);
        setTimeout(() => { this.backend.showImgUploadModal = false; }, 300);
        imgUploadMsg = 'Image uploaded successfully.';
        this.toast.toast(imgUploadMsg, 2000);
      }, error => {
        console.error('Image compression failed.', error);
        this.backend.showImgUploadModal = false;
        imgUploadMsg = 'Image upload failed. Try a different image?';
        this.toast.toast(imgUploadMsg, 2000);
      });
    }, error => {
      console.error('Image upload failed.', error);
      this.backend.showImgUploadModal = false;
      imgUploadMsg = 'Image upload failed. Try a different image?';
      this.toast.toast(imgUploadMsg, 2000);
    });
  }

  goToSession(host: boolean) {
    this.home.nativeElement.classList.remove('fade-in');
    this.ss.uiState = host ? UIState.CREATE_SESSION : UIState.JOIN_SESSION;
  }

  back() {
    this.ss.uiState = UIState.HOME;
    this.backend.showGameCodeError = false;
    this.backend.showGameStartedError = false;
    this.backend.showMaxPlayersError = false;
    this.backend.showPlayerNameError = false;
    this.backend.enteredPlayerName = "";
    this.backend.enteredGameCode = "";
    this.avatarSrc = DEFAULT_AVATAR_PATH;
    this.res.avatar = null;
  }

  optionsCompleted(): boolean {
    if (this.backend.DEBUG_MODE) { return true; }
    let rooms = [...this.backend.game.options.rooms].filter((room) => room != "");
    rooms.forEach((room) => room = room.toLowerCase());

    // true if all required rooms have been named and they are all unique
    let uniqueRoomNames: boolean = rooms.length >= this.backend.game.options.requiredRooms &&
      new Set(rooms).size == rooms.length &&
      this.backend.game.players.length >= 8;

    if (this.backend.game.custom) { // for custom games, need to make sure all players have selected their role
      return this.backend.game.players.every((player) => !!player.role) && uniqueRoomNames;
    } else { // if game isn't custom, only thing we need to check for is room names
      return uniqueRoomNames;
    }
  }

  customRoleIsAvailable(role: RoleName, excludeSelection: boolean = false): boolean {
    if (role == RoleName.PASSENGER) { return true; }
    let roleTaken = this.backend.game.players.some((player) => {
      return player.role?.ability == role || player.role?.name == role;
    });
    return !roleTaken && !(excludeSelection && role == this.customPlayer.role);
  }

  isCustomRoleComplete(): boolean {
    switch (this.customPlayer.role) {
      case undefined: return false;
      case RoleName.DETECTIVE:
      case RoleName.GHOST:
        return this.customPlayer.graveyardCard != undefined;
      default:
        return true;
    }
  }

  exitCustomGame() {
    this.back();
    this.customPlayer = { role: undefined, usedAbility: false, graveyardCard: undefined };
    this.backend.sendToLobby();
  }

  joinCustomGame() {
    this.backend.joinCustomGame(this.customPlayer, this.backend.player?.isHost ? this.backend.game.code : this.backend.enteredGameCode, this.backend.enteredPlayerName.trim());
    this.customPlayer = { role: undefined, usedAbility: false, graveyardCard: undefined };
  }

  getPlayerMeetings(): Player[] {
    let meetings = [];
    let round = this.backend.game.rounds[this.backend.game.roundIndex];
    for (let deliberation of round) {
      let meeting = deliberation.find((meeting) => meeting.playerOne.name == this.backend.player.name || meeting.playerTwo.name == this.backend.player.name);
      if (meeting.playerOne.name == this.backend.player.name) { meetings.push(meeting.playerTwo); }
      else { meetings.push(meeting.playerOne); }
    }
    return meetings;
  }

  getMeetingPartner(): string {
    let deliberation = this.backend.game.rounds[this.backend.game.roundIndex][this.backend.game.deliberationIndex];
    let meeting = deliberation.find((meeting) => meeting.playerOne.name == this.backend.player.name || meeting.playerTwo.name == this.backend.player.name);
    let partner = meeting.playerOne.name == this.backend.player.name ? meeting.playerTwo.name : meeting.playerOne.name;
    return partner;
  }

  getMeetingRoom(): string {
    let deliberation = this.backend.game.rounds[this.backend.game.roundIndex][this.backend.game.deliberationIndex];
    let meeting = deliberation.find((meeting) => meeting.playerOne.name == this.backend.player.name || meeting.playerTwo.name == this.backend.player.name);
    return meeting.room;
  }

  maroon(): void {
    this.marooningStarted = true; 
    this.backend.maroon(); 
  }

  flipCard(index: number = 0) {
    let card: ElementRef<HTMLImageElement>;
    if (index == 0) {
      card = this.displayCard;
    }
    else {
      if (this.ss.cardFlipped) { return; }
      this.ss.cardFlipped = true;
      switch (index) {
        case 1:
          card = this.cardOne; break;
        case 2:
          card = this.cardTwo; break;
        case 3:
          card = this.cardThree; break;
      }
      card.nativeElement.classList.add('zoom');
      // Yeah, this is ugly, but it works and I'm lazy - sue me
      card.nativeElement.parentElement.parentElement.style.overflow = 'visible';
    }
    card.nativeElement.classList.add('animated');
    setTimeout(() => {
      if (index == 0) {
        if (this.cardFrontShowing) {
          card.nativeElement.src = `/client/assets/marooning/Back.svg`;
          this.cardFrontShowing = false;
          this.hideAllegiance = true;
        } else {
          card.nativeElement.src = `/client/assets/roles/${this.backend.marooningDone ? this.backend.player.role.ability : this.backend.player.role.name}.svg`;
          this.cardFrontShowing = true;
          this.hideAllegiance = false;
        }
      } else {
        if (this.backend.player.role.name == RoleName.GHOST) { card.nativeElement.src = `/client/assets/roles/${this.backend.player.role.ability}.svg`; }
        else if (this.backend.player.role.ability == RoleName.DETECTIVE) { card.nativeElement.src = `/client/assets/roles/${this.backend.game.detectiveCard}.svg`; }
      }
      card.nativeElement.classList.remove('animated');
      card.nativeElement.classList.add('inverted');
      card.nativeElement.classList.add('animated-back');
      setTimeout(() => {
        card.nativeElement.classList.remove('inverted');
        card.nativeElement.classList.remove('animated-back');
      }, 240);
    }, 480);
  }

  openVoting() {
    if (this.backend.game.disconnected.length > 0) { this.toast.dialog(DialogType.OpenVoteDialog) }
    else { this.backend.openVoting(); }
  }

  adminDialog() {
    this.toast.dialog(DialogType.AdminDialog);
  }

  lucasTip() {
    this.toast.dialog(DialogType.TipDialog);
  }

  openWiki() {
    this.toast.dialog(DialogType.Wiki);
  }

  toggleAudio(ev: any) {
    ev.stopPropagation();
    this.audio.toggleAudio();
    // Toggle switch if the click didn't toggle it already(ie, it was toggled by the menu item click)
    if (ev.target.tagName == 'BUTTON') { this.audioToggle.toggle(); }
  }
}
