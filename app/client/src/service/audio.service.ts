import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  audioSetupEmitter: EventEmitter<void> = new EventEmitter<void>();

  marooningAudioSrc: string;

  // handles playing both marooning audio and meeting ended sounds.
  // normally I wouldn't have to do this workaround, but my friends have iPhones and Apple makes this a pain.
  sfx: HTMLAudioElement;
  audio: HTMLAudioElement;
  mute: boolean = false;

  get emptySound(): string { return "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"; }
  get gong(): string { return "/client/assets/marooning/gong.wav"; }
  get tick1(): string { return "/client/assets/sfx/tick-1.wav"; }
  get tick2(): string { return "/client/assets/sfx/tick-2.wav"; }
  get meetingEndSignal(): string { return '/client/assets/sfx/round-change.wav'; }
  get timerPause(): string { return "/client/assets/sfx/timer-pause.wav"; }
  get timerResume(): string { return "/client/assets/sfx/timer-resume.wav"; }
  get lobbyTheme(): string { return "/client/assets/music/lobby-theme.wav"; }
  get votingTheme(): string { return "/client/assets/music/voting-theme.wav"; }

  constructor() { }

  reset() {
    this.marooningAudioSrc = "";
  }

  setupAudio() {
    this.audioSetupEmitter.emit();
  }

  init() {
    this.sfx = new Audio();
    this.sfx.autoplay = true;
    this.sfx.src = this.emptySound;

    this.audio = new Audio();
    this.audio.autoplay = true;
    this.audio.src = this.emptySound;
  }

  toggleAudio() {
    this.mute = !this.mute;
    this.shh();
  }

  shh() {
    this.sfx.muted = this.mute;
    this.audio.muted = this.mute;
  }

  startLobbyTheme() {
    this.audio.loop = true;
    this.audio.src = this.lobbyTheme;
    if (this.mute) { this.shh(); }
  }

  startVotingTheme() {
    this.audio.loop = true;
    this.audio.src = this.votingTheme;
    if (this.mute) { this.shh(); }
  }

  stopMusic() {
    this.audio.loop = false;
    this.audio.src = this.emptySound;
  }

  setMarooningAudio(debug: boolean, audioSrc: string) {
    this.marooningAudioSrc = debug ? this.gong : audioSrc;
  }

  beginMarooning(callback: any) {
    // can't mute marooning
    this.audio.src = this.marooningAudioSrc;
    // go to round display after marooning
    this.audio.addEventListener("ended", callback);
  }

  endMarooning(callback: any) {
    this.audio.removeEventListener("ended", callback);
  }

  tick() {
    let tick = Math.floor(Math.random() * 2); // 0 or 1
    this.sfx.src = tick == 0 ? this.tick1 : this.tick2;
    if (this.mute) { this.shh(); }
  }

  roundStart() {
    this.sfx.src = this.gong;
    if (this.mute) { this.shh(); }
  }

  pause() {
    this.sfx.src = this.timerPause;
    if (this.mute) { this.shh(); }
  }

  resume() {
    this.sfx.src = this.timerResume;
    if (this.mute) { this.shh(); }
  }

  meetingEnd() {
    this.sfx.src = this.meetingEndSignal;
    if (this.mute) { this.shh(); }
  }

}
