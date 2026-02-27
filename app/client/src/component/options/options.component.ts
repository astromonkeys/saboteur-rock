import { Component, ElementRef, ViewChild } from '@angular/core';
import { BackendService } from '../../service/backend.service';
import { ToasterService } from '../../service/toaster.service';
import { StateService } from '../../service/state.service';
import { GameOptions, GamePhase } from 'saboteur-lib';

@Component({
  selector: 'option-menu',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss']
})
export class OptionsComponent {

  @ViewChild('canvas') canvas: ElementRef<HTMLCanvasElement>;

  changes: GameOptions;

  get pregame(): boolean { return this.backend.game.state == GamePhase.PREGAME; }
  get placeholderRooms(): string[] {
    return ['Ballroom', 'Library', 'Dining Room', 'Conservatory', 'Study', 'Billiard Room', 'Lounge'];
  }

  constructor(
    public backend: BackendService,
    public ss: StateService,
  ) { }

  ngOnInit() {
    this.changes = Object.assign(this.backend.game.options);
  }

  ngAfterViewInit() {
    let ctx = this.canvas.nativeElement.getContext('2d');
    this.canvas.nativeElement.setAttribute('width', '400');
    this.canvas.nativeElement.setAttribute('height', '600');
    ctx.lineWidth = 2;
    // draw lines on room diagram
    // room 1
    ctx.beginPath();
    ctx.moveTo(100, 90);
    ctx.lineTo(200, 60);
    ctx.stroke();
    // room 2
    ctx.beginPath();
    ctx.moveTo(130, 175);
    ctx.lineTo(210, 150);
    ctx.stroke();
    // room 3
    ctx.beginPath();
    ctx.moveTo(55, 205);
    ctx.lineTo(210, 220);
    ctx.stroke();
    // room 4
    ctx.beginPath();
    ctx.moveTo(90, 300);
    ctx.lineTo(200, 300);
    ctx.stroke();
    // room 5
    ctx.beginPath();
    ctx.moveTo(130, 430);
    ctx.lineTo(200, 380);
    ctx.stroke();
    // room 6
    ctx.beginPath();
    ctx.moveTo(55, 440);
    ctx.lineTo(190, 480);
    ctx.stroke();
    // room 7
    ctx.beginPath();
    ctx.moveTo(100, 550);
    ctx.lineTo(200, 560);
    ctx.stroke();
  }

}
