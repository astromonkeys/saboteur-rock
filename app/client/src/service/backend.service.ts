import { Injectable } from '@angular/core';
import { Haptics } from '@capacitor/haptics';
import { Socket } from 'ngx-socket-io';
import { ServerRequest, ServerMsg, UIState, GamePhase, VoteState, Player, SaboteurRockGame, Vote, ResultState, MarooningState, RoleName, PlayerImg, ServerError, CustomPlayer, GameOptions } from 'saboteur-lib';
import { AudioService } from './audio.service';
import { ResourceService } from './resource.service';
import { StateService } from './state.service';
import { DialogType, ToasterService } from './toaster.service';

@Injectable({
  providedIn: 'root'
})
export class BackendService {

  readonly DEBUG_MODE: boolean = true; // flip to false in release branches/playtests

  enteredGameCode: string;
  enteredPlayerName: string;
  showGameCodeError: boolean = false;
  showPlayerNameError: boolean = false;
  showMaxPlayersError: boolean = false;
  showGameStartedError: boolean = false;
  showConnectingModal: boolean = false;
  showLoadingModal: boolean = false;
  showImgUploadModal: boolean = false;

  reloadNeeded: boolean = false;

  marooningDone: boolean = false;

  private _game: SaboteurRockGame; // stores information needed for display in UI. backend calls/responses keep this in sync with the server
  get game(): SaboteurRockGame { return this._game; }
  set game(game: SaboteurRockGame) { this._game = game; }

  private _player: Player; // the player represented by this app instance
  get player(): Player { return this._player; }
  set player(player: Player) { this._player = player; }

  get playAudio(): boolean { return this.player.isDisplay || (this.game.displays.length == 0 && this.player.isHost); }

  constructor(
    private socket: Socket,
    private ss: StateService,
    private res: ResourceService,
    private toast: ToasterService,
    private audio: AudioService
  ) {
    this.socket.on('connect_error', () => { this.showConnectingModal = true; this.reloadNeeded = true; });
    this.socket.on('connect', () => { this.showConnectingModal = false; this.reset(); });
    this.socket.on(ServerMsg.ERROR, (type: ServerError) => {
      this.showLoadingModal = false;
      switch (type) {
        case ServerError.GAME_NOT_FOUND:
          this.showGameCodeError = this.enteredGameCode?.length > 0;
          break;
        case ServerError.DUPLICATE_PLAYER:
          this.showPlayerNameError = this.enteredPlayerName?.length > 0;
          break;
        case ServerError.MAX_PLAYERS:
          this.showMaxPlayersError = true;
          break;
        case ServerError.GAME_STARTED:
          this.showGameStartedError = this.enteredGameCode?.length > 0;
          break;
      }
    });

    this.socket.on(ServerMsg.ADD_PLAYER, async (game: SaboteurRockGame, player: Player, avatars: PlayerImg[]) => {
      this.showLoadingModal = true;
      this.game = game;
      this.player = player;
      // set up audio here, fake the user interaction (thanks Apple)
      this.audio.setupAudio();
      this.res.storePlayerData(game.code, player.name);
      if (avatars) {
        this.res.bulkPutImage(avatars);
        setTimeout(() => { this.showLoadingModal = false; }, 500);
      }
      else { setTimeout(() => { this.showLoadingModal = false; }, 500); }
      switch (this.game.state) {
        // in most cases, we'll go into this block
        // other blocks are in case the player disconnects/rejoins during the game
        case GamePhase.PREGAME:
          if (this.game.custom && !this.player.role && !this.player.isDisplay) {
            this.ss.uiState = UIState.CUSTOM_SESSION;
          } else {
            this.ss.uiState = UIState.LOBBY;
            // only display player plays lobby music, to avoid switching from host -> display and restarting playback
            if (this.player.isDisplay) {
              setTimeout(() => {
                if (this.ss.uiState == UIState.LOBBY) { this.audio.startLobbyTheme(); }
              }, 1500);
            }
          }
          break;
        case GamePhase.MAROONING:
          this.ss.uiState = UIState.MAROONING;
          this.ss.marooningState = MarooningState.NORMAL;
          break;
        case GamePhase.MEETING:
        case GamePhase.TRANSITION:
        case GamePhase.PREVOTE:
          this.ss.uiState = UIState.ROUND_DISPLAY;
          break;
        case GamePhase.VOTE:
          this.ss.uiState = UIState.VOTING;
          let hasVoted = this.game.voteRounds[game.roundIndex]?.find((vote) => vote.owner.name.toLowerCase() == this.player.name.toLowerCase()) ? true : false;
          this.ss.voteState = hasVoted ? VoteState.WAIT : VoteState.BALLOT;
          if (this.game.voteResults[game.roundIndex].tieResolved == false) { this.ss.voteState = VoteState.TIEBREAKER; }
          if (this.playAudio) {
            setTimeout(() => {
              if (this.ss.uiState == UIState.VOTING) { this.audio.startVotingTheme(); }
            }, 1500);
          }
          break;
        case GamePhase.RESULTS:
          this.ss.uiState = UIState.VOTE_RESULTS;
          this.ss.resultState = ResultState.ABILITY;
          break;
      }
    });

    this.socket.on(ServerMsg.PLAYER_JOIN, async (game: SaboteurRockGame, newPlayer: string, isHost: boolean, avatar: PlayerImg, isDisplay: boolean) => {
      this.game = game;
      if (isDisplay) {
        if (this.player.isHost) {
          this.toast.toast('Display player connected', 3500);
          this.audio.stopMusic();
        }
      } else {
        // if old host reconnects, strip host duties from everyone else
        if (isHost && this.player.name != newPlayer) { this.player.isHost = false; }
        // don't need to add avatar if this player just joined, since we already have it
        if (avatar && avatar.name != this.player.name) { this.res.putImage(avatar); }
      }
    });

    this.socket.on(ServerMsg.REMOVE_PLAYER, (game: SaboteurRockGame, player: Player, newHost: Player) => {
      this.game = game;
      if (game.players.length == 0 || player?.name == this.player?.name) { this.reset(); }
      if (player.isDead) { this.res.deleteImage(player.name); } // don't want to delete imgs of living players in case they reconnect
      if (newHost) {
        if (newHost.name == this.player.name) { this.player.isHost = true; }
        else { this.player.isHost = false; }
      }
    });

    this.socket.on(ServerMsg.ASSIGN_ROLES, (game: SaboteurRockGame, audioSrc: string) => {
      this.game = game;
      if (this.playAudio) { this.audio.stopMusic(); }
      if (!this.player.isDisplay) { this.player = this.game.players.find((player) => player.name == this.player.name); }
      this.audio.setMarooningAudio(this.DEBUG_MODE, audioSrc);
      this.ss.uiState = UIState.MAROONING;
    });

    this.socket.on(ServerMsg.UPDATE_OPTIONS, (game: SaboteurRockGame) => {
      if (!(JSON.stringify(this.game.options) === JSON.stringify(game.options))) {
        if (this.game.state != GamePhase.PREGAME && this.game.state != GamePhase.MAROONING) { this.toast.toast('Settings will be applied next round', 3500); }
      } else {
        this.game = game;
      }
    })

    this.socket.on(ServerMsg.BEGIN_MAROONING, () => {
      this.ss.marooningState = MarooningState.NORMAL;
      this.ss.marooningActive = true;
      if (this.playAudio) {
        this.audio.stopMusic();
        this.audio.beginMarooning(() => { this.endMarooning(); });
      }
    });

    this.socket.on(ServerMsg.MAROONING_ABILITY, (role: RoleName, show: boolean) => {
      this.ss.cardFlipped = false; // reset in case the ghost and detective are the same
      if (role == RoleName.GHOST && this.player.role?.name == RoleName.GHOST) {
        this.ss.marooningState = show ? MarooningState.GHOST : MarooningState.NORMAL;
      } else if (role == RoleName.DETECTIVE && this.player.role?.ability == RoleName.DETECTIVE) {
        this.ss.marooningState = show ? MarooningState.DETECTIVE : MarooningState.NORMAL;
      }
    });

    this.socket.on(ServerMsg.END_MAROONING, () => {
      this.ss.marooningActive = false;
      this.marooningDone = true;
      this.ss.marooningState = MarooningState.NORMAL;
    })

    this.socket.on(ServerMsg.GEN_ROUND, (game: SaboteurRockGame) => {
      this.game = game;
      if (this.playAudio) { this.audio.stopMusic(); }
      if (game.dead.find((player) => player.name == this.player.name)) { this.player.isDead = true; }
      this.ss.uiState = this.player.isDisplay ? UIState.ROUND_DISPLAY : UIState.PRE_ROUND;
    });

    this.socket.on(ServerMsg.ROUND_START, (countdown: number, state: GamePhase) => {
      this.game.countdown = countdown;
      this.game.state = state;
      this.ss.uiState = UIState.ROUND_DISPLAY;
      this.ss.voteState = VoteState.BALLOT;
      if (this.playAudio) { this.audio.roundStart(); }
    })

    this.socket.on(ServerMsg.TIMER_TOGGLE, (doTimer: boolean) => {
      this.game.doTimer = doTimer;
      doTimer ? this.audio.resume() : this.audio.pause();
    });

    this.socket.on(ServerMsg.TIMER_DECREMENT, (newCountdown: number) => {
      this.game.countdown = newCountdown;
      if (this.game.state == GamePhase.MEETING && this.game.countdown == 0 && !this.player.isDead) {
        // play meeting end signal for all living players + display
        this.audio.meetingEnd();
      }
    });

    this.socket.on(ServerMsg.TIMER_END, async (state: GamePhase, countdown: number, deliberationIndex: number) => {
      this.game.state = state;
      this.game.countdown = countdown;
      this.game.deliberationIndex = deliberationIndex;
      if (this.game.state != GamePhase.PREVOTE) {
        try {
          await Haptics.vibrate({ duration: 450 }); // signal the end of a round
        } catch {
          console.debug('[TIMER_END] vibrate API not supported. Thanks Apple!');
        }
      }
    });

    this.socket.on(ServerMsg.SEND_TO_VOTING, (game: SaboteurRockGame) => {
      this.game = game;
      this.ss.uiState = UIState.VOTING;
      if (this.playAudio) {
        setTimeout(() => {
          if (this.ss.uiState == UIState.VOTING) this.audio.startVotingTheme()
        }, 1500);
      }
    });

    this.socket.on(ServerMsg.TIEBREAK_START, (game: SaboteurRockGame, abridged: boolean) => {
      this.game = game;
      if (this.playAudio) { this.audio.stopMusic(); }
      this.ss.initGraph(game.voteResults[game.roundIndex],
        game.voteResults[game.roundIndex].votes.filter((vote) => { return vote[0].name != this.res.dummyName && vote[1] > 0; }),
        this.player.isDisplay);
      this.ss.uiState = UIState.VOTE_RESULTS;
      if (abridged) { this.ss.resultState = ResultState.SUMMARY; }
    });

    this.socket.on(ServerMsg.SEND_TO_TIEBREAK, () => {
      this.ss.uiState = UIState.VOTING;
      this.ss.voteState = VoteState.TIEBREAKER;
      if (this.playAudio) { setTimeout(() => this.audio.startVotingTheme(), 1500); }
    });

    this.socket.on(ServerMsg.VOTE_CT, (game: SaboteurRockGame) => {
      this.game = game;
      if (this.player.isDisplay) { this.audio.tick(); }
    })

    this.socket.on(ServerMsg.VOTING_COMPLETE, (game: SaboteurRockGame) => {
      this.game = game;
      if (this.playAudio) { this.audio.stopMusic(); }
      this.ss.initGraph(game.voteResults[game.roundIndex],
        game.voteResults[game.roundIndex].votes.filter((vote) => { return vote[0].name != this.res.dummyName && vote[1] > 0; }),
        this.player.isDisplay);
      this.game.state = GamePhase.TRANSITION; // reset timer for next transition
      this.ss.resultState = game.voteResults[game.roundIndex].tie ? ResultState.ELIMINATED : ResultState.ABILITY;
      this.ss.uiState = UIState.VOTE_RESULTS;
    });

    this.socket.on(ServerMsg.VICTORY, (game: SaboteurRockGame) => {
      this.game = game;
      this.ss.uiState = UIState.VICTORY;
    });

    this.socket.on(ServerMsg.SEND_TO_HOME, () => {
      this.socket.emit(ServerRequest.CLEANUP_SOCKET, this.game.code);
      this.res.clearPlayerData();
      this.reset();
    });

    // Check for an existing game, automatically rejoining if a valid one is found
    const code = localStorage.getItem(this.res.localStorageCodeKey);
    const name = localStorage.getItem(this.res.localStorageNameKey);
    if (code && name) {
      // check if game still exists before attempting to rejoin. callback yields an immediate response
      this.socket.emit(ServerRequest.GAME_EXISTS, code, (exists: boolean) => {
        if (exists) {
          // prompt player to rejoin with modal
          this.toast.dialog(DialogType.ReconnectDialog, { code: code, name: name });
        } else {
          // if a code was found but the game no longer exists, reset
          localStorage.clear();
          this.reset();
        }
      });
    }
  }

  kickPlayer(name: string) {
    this.socket.emit(ServerRequest.PLAYER_LEAVE, this.game.code, name);
  }

  sendToLobby() {
    if (this.player.isHost || this.player.isDisplay) {
      this.socket.emit(ServerRequest.SEND_TO_HOME, this.game.code)
    } else {
      this.socket.emit(ServerRequest.PLAYER_LEAVE, this.game.code, this.player.name);
      this.reset();
    }
  }

  victory() { this.socket.emit(ServerRequest.VICTORY, this.game.code); }

  tiebreak(target: Player) { this.socket.emit(ServerRequest.TIEBREAK_VOTE, this.game.code, this.player, target); }

  sendToTiebreaker() { this.socket.emit(ServerRequest.SEND_TO_TIEBREAK, this.game.code); }

  closeVoting() { this.socket.emit(ServerRequest.CLOSE_VOTING, this.game.code); }

  castVote(vote: Vote) { this.socket.emit(ServerRequest.CAST_VOTE, this.game.code, vote); }

  openVoting() { this.socket.emit(ServerRequest.SEND_TO_VOTING, this.game.code); }

  toggleCountdown() { this.socket.emit(ServerRequest.TIMER_TOGGLE, this.game.code); }

  startRound() { this.socket.emit(ServerRequest.ROUND_START, this.game.code); }

  generateRound() { 
    if (this.game.disconnected.length > 0) {
      let confirm = this.toast.dialog(DialogType.DisconnectedDialog, { bodyText: 'Are you sure you want to begin the round?' });
      if (!confirm) { return; }
    }
    this.socket.emit(ServerRequest.GEN_ROUND, this.game.code); 
  }

  endMarooning() {
    this.audio.endMarooning(() => { this.endMarooning(); });
    this.socket.emit(ServerRequest.END_MAROONING, this.game.code);
  }

  maroon() {
    if (!this.marooningDone) {
      if (this.game.disconnected.length > 0) {
        let confirm = this.toast.dialog(DialogType.DisconnectedDialog, { bodyText: 'Are you sure you want to begin the marooning?' });
        if (!confirm) { return; }
      }
      this.socket.emit(ServerRequest.BEGIN_MAROONING, this.game.code);
    } else {
      this.generateRound();
    }
  }

  startGame() { this.socket.emit(ServerRequest.GAME_START, this.game.code); }

  updateGameOptions(changes: GameOptions) {
    this.ss.showOptions = false;
    // Show changes in UI, but they won't be applied in the game logic until appropriate
    this.game.options = changes;
    this.socket.emit(ServerRequest.UPDATE_OPTIONS, this.game.code, changes);
  }

  generateGameInstance() {
    this.socket.emit(ServerRequest.CREATE_GAME, this.enteredPlayerName.trim(), this.res.avatar, this.ss.customGame);
  }

  joinAsDisplay() {
    this.socket.emit(ServerRequest.DISPLAY_JOIN, this.enteredGameCode);
  }

  joinCustomGame(customPlayer: CustomPlayer, code: string, playerName: string) {
    this.socket.emit(ServerRequest.JOIN_CUSTOM_GAME, customPlayer, code, playerName);
  }

  joinExistingGame(code: string, playerName: string, avatar: Uint8Array) {
    this.socket.emit(ServerRequest.ADD_PLAYER, code, playerName, avatar);
  }

  reset() {
    this.res.clearDb();
    if (this.reloadNeeded) { window.location.reload(); }
    else {
      this.clear();
      this.ss.uiState = UIState.HOME;
    }
  }

  clear() {
    this.player = null;
    this.game = null;
    this.enteredGameCode = "";
    this.showGameCodeError = false;
    this.showPlayerNameError = false;
    this.showGameStartedError = false;
    this.showMaxPlayersError = false;
    this.showConnectingModal = false;
    this.showLoadingModal = false;
    this.marooningDone = false;
    this.audio.reset();
    // TODO: do we need to cleanup things on the backend?
  }

}
