import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { BackendService } from '../../service/backend.service';
import { ResourceService } from '../../service/resource.service';
import { StateService } from '../../service/state.service';
import { Player, RoleName, UIState } from 'saboteur-lib';

interface bouncingImg {
  x: number;
  y: number;
  dx: number;
  dy: number;
  text?: string;
  img: HTMLImageElement;
}

@Component({
  selector: 'bouncing-img',
  standalone: true,
  imports: [],
  templateUrl: './bouncing-img.component.html',
  styleUrl: './bouncing-img.component.scss'
})
export class BouncingImgComponent {

  @ViewChild('canvas') canvasRef: ElementRef;
  private ctx: CanvasRenderingContext2D;
  private bouncingImgs: bouncingImg[] = [];
  private imgRadius = 35;

  constructor(
    private backend: BackendService,
    private res: ResourceService,
    private ss: StateService
  ) { }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.setCanvasSize();
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.setCanvasSize();
    this.initCanvas();
    this.draw();
  }

  private setCanvasSize(): void {
    const canvas = this.ctx.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val)); 
  }

  initCanvas(): void {
    // only implemented in home and victory for displays
    this.bouncingImgs = [];
    if (this.ss.uiState == UIState.HOME) {
      this.imgRadius = 30;
      Object.values(RoleName).forEach((role) => {
        let img = new Image(this.imgRadius, this.imgRadius);
        img.src = this.res.getRoleIcon(role);
        this.bouncingImgs.push({
          x: this.clamp(Math.random() * (this.ctx.canvas.width - this.imgRadius) + 10, this.imgRadius + 10, this.ctx.canvas.width - this.imgRadius),
          y: this.clamp(Math.random() * (this.ctx.canvas.height  - this.imgRadius) + 10, this.imgRadius + 10, this.ctx.canvas.height - this.imgRadius),
          dx: (Math.random() - 0.5) * 2,
          dy: (Math.random() - 0.5) * 2,
          text: null,
          img: img
        });
      });
    } else if (this.ss.uiState == UIState.VICTORY) {
      let players: Player[] = this.backend.game.stowaways.concat(this.backend.game.passengers);
      for (let i = 0; i < players.length; i++) {
        this.res.getImage(players[i].name).then((data) => {
          let img = new Image(this.imgRadius, this.imgRadius);
          // nested ternary operators, neat
          img.src = this.backend.deadWinners.concat(this.backend.deadLosers).find((el) => el.name == players[i].name) ? this.res.deadAvatar : (data ? URL.createObjectURL(new Blob([data as BlobPart])) : this.res.emptyAvatar);
          this.bouncingImgs.push({
            x: this.clamp(Math.random() * (this.ctx.canvas.width - this.imgRadius), this.imgRadius, this.ctx.canvas.width - this.imgRadius),
            y: this.clamp(Math.random() * (this.ctx.canvas.height  - this.imgRadius), this.imgRadius, this.ctx.canvas.height - this.imgRadius),
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2,
            text: players[i].name,
            img: img
          });
        });
      }
    }
  }

  draw(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.bouncingImgs.forEach(img => {
      this.ctx.save();

      // draw image in a circle instead of a square
      this.ctx.beginPath();
      this.ctx.arc(img.x, img.y, this.imgRadius, 0, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.clip();
      
      this.ctx.globalAlpha = 0.7;
      this.ctx.drawImage(img.img, img.x - this.imgRadius, img.y - this.imgRadius, this.imgRadius * 2, this.imgRadius * 2);

      this.ctx.restore();

      this.ctx.font = "20px Chelsea Market";
      if (img.text) { this.ctx.fillText(img.text, img.x + this.imgRadius + 10, img.y - 10 + this.imgRadius / 2); }

      img.x += img.dx;
      img.y += img.dy;

      if (img.x + this.imgRadius >= this.ctx.canvas.width
        || img.x <= this.imgRadius) {
        img.dx = -img.dx;
      }
      if (img.y + this.imgRadius >= this.ctx.canvas.height
        || img.y <= this.imgRadius) {
        img.dy = -img.dy;
      }
    });

    requestAnimationFrame(() => this.draw());
  }
}
