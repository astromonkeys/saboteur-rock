import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { Player, Team } from 'saboteur-lib';
import { AvatarComponent } from '../avatar/avatar.component';
import { BackendService } from '../../service/backend.service';
import { MaterialModule } from '../../material/material.module';
import { ResourceService } from '../../service/resource.service';
import { TypeService } from '../../service/type.service';

interface bouncingPlayer {
  x: number;
  y: number;
  dx: number;
  dy: number;
  name: string;
  img: HTMLImageElement;
}

@Component({
  selector: 'app-victory',
  templateUrl: './victory.component.html',
  styleUrls: ['./victory.component.scss'],
  standalone: true,
  imports: [MaterialModule, AvatarComponent]
})
export class VictoryComponent {

  @Input() display: boolean = false;

  @ViewChild('canvas') canvasRef: ElementRef;
  private ctx: CanvasRenderingContext2D;
  private bouncingPlayers: bouncingPlayer[] = [];
  private imgRadius = 35;

  get winners(): Player[] { return this.backend.game.victory == Team.PASSENGERS ? this.backend.game.passengers : this.backend.game.stowaways; }
  get losers(): Player[] { return this.backend.game.victory == Team.PASSENGERS ? this.backend.game.stowaways : this.backend.game.passengers; }

  get livingWinners(): Player[] { return this.winners.filter((player) => !player.isDead); }
  get deadWinners(): Player[] { return this.winners.filter((player) => player.isDead); }
  get livingLosers(): Player[] { return this.losers.filter((player) => !player.isDead); }
  get deadLosers(): Player[] { return this.losers.filter((player) => player.isDead); }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.setCanvasSize();
  }

  constructor(
    public backend: BackendService,
    public res: ResourceService,
    public types: TypeService
  ) { }

  ngAfterViewInit(): void {
    if (this.display) {
      this.ctx = this.canvasRef.nativeElement.getContext('2d');
      this.initCanvas();
      this.draw();
    }
  }

  private setCanvasSize(): void {
    const canvas = this.ctx.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  initCanvas(): void {
    let players: Player[] = this.backend.game.stowaways.concat(this.backend.game.passengers);
    for (let i = 0; i < players.length; i++) {
      this.res.getImage(players[i].name).then((data) => {
        let img = new Image(this.imgRadius, this.imgRadius);
        // nested ternary operators, neat
        img.src = this.deadWinners.concat(this.deadLosers).find((el) => el.name == players[i].name) ? this.res.deadAvatar : (data ? URL.createObjectURL(new Blob([data])) : this.res.emptyAvatar);
        this.bouncingPlayers.push({
          x: Math.random() * (this.ctx.canvas.width - this.imgRadius) + this.imgRadius,
          y: Math.random() * (this.ctx.canvas.height - this.imgRadius) + this.imgRadius,
          dx: (Math.random() - 0.5) * 2,
          dy: (Math.random() - 0.5) * 2,
          name: players[i].name,
          img: img
        });
      });
    }
    this.setCanvasSize();
  }

  draw(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.bouncingPlayers.forEach(player => {    
      this.ctx.save();

      if (player.img.src != this.res.deadAvatar) {
        // draw image in a circle instead of a square
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, this.imgRadius, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.clip();
      }

      this.ctx.drawImage(player.img, player.x - this.imgRadius, player.y - this.imgRadius, this.imgRadius * 2, this.imgRadius * 2);

      this.ctx.restore();

      this.ctx.font = "20px trebuchet ms";
      this.ctx.fillText(player.name, player.x + this.imgRadius + 10, player.y - 10 + this.imgRadius / 2);

      player.x += player.dx;
      player.y += player.dy;

      if (player.x + this.imgRadius > this.ctx.canvas.width || player.x - this.imgRadius < 0) {
        player.dx = -player.dx;
      }
      if (player.y + this.imgRadius + 10 > this.ctx.canvas.height || player.y - this.imgRadius < 0) {
        player.dy = -player.dy;
      }
    });

    requestAnimationFrame(() => this.draw());
  }

}
