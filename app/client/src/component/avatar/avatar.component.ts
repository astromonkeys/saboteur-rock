import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { ResourceService } from '../../service/resource.service';
import { MaterialModule } from '../../material/material.module';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  standalone: true,
  imports: [MaterialModule],
  animations: [
    trigger('fadeInOut', [
      state('in', style({ opacity: 1 })),
      transition(':enter', [style({ opacity: 0 }), animate('0.5s')]),
      // transition(':leave', [animate('0.7s', style({ opacity: 0 }))]), // TODO: fix fade out
    ]),
  ]
})
export class AvatarComponent {

  @ViewChild('wrapper') wrapper: ElementRef<HTMLDivElement>;

  @Input() name: string; // required
  @Input() imgSrc: string = this.res.emptyAvatar;
  @Input() hideImage: boolean = false;
  @Input() host: boolean = false;
  @Input() compact: boolean = false;
  @Input() animated: boolean = false; // do fade-in/out?
  @Input() dead: boolean = false;
  @Input() shrink: boolean = false; // shrink text based on length?
  @Input() vote: boolean = false;
  @Input() vertical: boolean = false;
  @Input() display: boolean = false;
  @Input() upload: boolean = false;
  @Input() circle: boolean = false;

  imgData: Uint8Array;

  get displayName(): string { return `${this.name}${this.host ? " (host)" : ""}`; }

  constructor(
    private res: ResourceService
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    if (this.name == this.res.dummyName) {
      this.imgSrc = this.dead ? this.res.deadAvatar : this.res.emptyAvatar;
      this.imgData = null;
    } else {
      this.res.getImage(this.name).then((data) => {
        if (!data && !this.upload) { // let player component handle the upload button's image
          this.imgSrc = this.dead ? this.res.deadAvatar : this.res.emptyAvatar;
          this.imgData = null;
        } else { this.imgData = data; }
      });
    }
  }

  ngDoCheck() {
    if (this.dead) {
      this.imgSrc = this.res.deadAvatar;
      return;
    } else if (this.imgData) {
      let blob = new Blob([this.imgData], { type: 'img/png' });
      this.imgSrc = URL.createObjectURL(blob);
    }
  }

  get avatarClass(): string {
    if (this.compact) {
      if (this.imgSrc == this.res.emptyAvatar) { return 'avatar compact filter'; }
      else if (this.imgSrc == this.res.deadAvatar) { return 'avatar compact dead'; }
      else { return 'avatar compact'; }
    } else if (this.vertical) {
      return this.imgSrc == this.res.emptyAvatar ? 'avatar-large filter' : 'avatar-large';
    } else {
      return this.imgSrc == this.res.emptyAvatar ? 'avatar filter' : 'avatar';
    }
  }

  get imgOffset(): string {
    return this.vote ? `-${this.displayName.length > 10 ? this.displayName.length + 1 : this.displayName.length}px` : '0px';
  }

  get textSize(): string {
    if (this.shrink) { return `${20 - (this.displayName.length / 2)}px`; }
    else if (this.compact) { return `17px`; }
    else { return `20px`; }
  }

  get textOffset(): string {
    if (this.hideImage) { return `-15px`; }
    else if (this.display) { return `35px`; }
    else { return this.compact ? '12px' : '75px'; }
  }

}
