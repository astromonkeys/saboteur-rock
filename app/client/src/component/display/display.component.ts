import { Component, ElementRef, ViewChild } from '@angular/core';
import { ChartComponent } from "ng-apexcharts";
import { AudioService } from '../../service/audio.service';
import { BackendService } from '../../service/backend.service';
import { ResourceService } from '../../service/resource.service';
import { StateService } from '../../service/state.service';
import splashTextJSONData from 'app/client/assets/json/splash_text.json';
import { TypeService } from '../../service/type.service';

@Component({
  selector: 'app-display',
  templateUrl: './display.component.html',
  styleUrls: ['./display.component.scss'],
})
export class DisplayComponent {

  @ViewChild("chart") chart: ChartComponent;
  @ViewChild("splashTextRef") splashTextRef: ElementRef;

  splashTextMasterList: string[] = splashTextJSONData; // what we reset to
  splashTextBank: string[] = [...this.splashTextMasterList]; // where we pull from
  splashText: string;

  get numCols(): number { return Math.min(this.backend.game.rounds[this.backend.game.roundIndex].length, 7); }

  get windowHeight(): string {
    return `${window.innerHeight}px`;
  }

  get colCount(): string {
    return `${Math.ceil(this.backend.game.rounds[this.backend.game.roundIndex].length / 2)}`;
  }

  readonly rdDisplayCols: string[] = ['Players', 'Room'];
  readonly nametagWidth: number = 80;
  readonly nametagHeight: number = 20;

  constructor(
    public ss: StateService,
    public backend: BackendService,
    public res: ResourceService,
    private audio: AudioService,
    public types: TypeService
  ) { }

  ngOnInit() {
    // remove intro text, which is always shown first
    this.splashText = this.splashTextBank[0];
    this.splashTextBank.splice(0, 1);
  }

  onCodeInput() {
    this.backend.enteredGameCode = this.backend.enteredGameCode.toUpperCase();
    this.backend.showGameCodeError = false;
    this.backend.showMaxPlayersError = false;
    this.backend.showGameStartedError = false;
  }

  joinAsDisplay() {
    // set up audio here, since this is the first point of user interaction
    this.audio.setupAudio();
    this.backend.joinAsDisplay();
  }

  getNametagPos(index: number): any {
    index = this.manipulateIndex(index);
    let radians = (Math.PI * 2 / 14) * index;
    let radX = window.innerWidth / 2;
    let radY = window.innerHeight / 2;
    let x = (radX / 2) - (this.nametagWidth / 2) + (Math.cos(radians) * radX * .65);
    let y = (radY / 2) + (this.nametagHeight) + (Math.sin(radians) * radY * .6);
    return {
      left: `${x}px`,
      top: `${y}px`
    };
  }

  getAvatarPos(index: number): any {
    index = this.manipulateIndex(index);
    let radians = (Math.PI * 2 / 14) * index;
    let radX = window.innerWidth / 2;
    let radY = window.innerHeight / 2;
    let x = (radX / 2) - 60 + (Math.cos(radians) * radX * .65);
    let y = (radY / 2) - 25 + (Math.sin(radians) * radY * .6);
    return {
      left: `${x}px`,
      top: `${y}px`
    };
  }

  // change index show elements appear in clockwise order
  manipulateIndex(index: number): number {
    switch (index) {
      case 0: return 11;
      case 1: return 12;
      case 2: return 13;
      default: return index - 3;
    }
  }

  getSplashText(): string {
    if (this.splashTextBank.length == 0) {
      // reset bank when we run out
      this.splashTextBank = [...this.splashTextMasterList];
      this.splashTextBank.splice(0, 1);
    }
    let index = Math.round(Math.random() * (this.splashTextBank.length - 1));
    let newText = this.splashTextBank[index];
    this.splashTextBank.splice(index, 1);
    return newText;
  }

  resetSplashText(ev: any) {
    // reset animation
    this.splashTextRef.nativeElement.classList.remove('splash-text');
    setTimeout(() => this.splashTextRef.nativeElement.classList.add('splash-text'), 10);
    // update text
    this.splashText = this.getSplashText();
  }
}
