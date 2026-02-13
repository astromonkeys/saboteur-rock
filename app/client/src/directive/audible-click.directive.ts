import { Directive, ElementRef, HostListener } from '@angular/core';
import { AudioService } from '../service/audio.service';

@Directive({
  selector: '[audibleClick]'
})
export class AudibleClickDirective {

  constructor(
    private element: ElementRef,
    private audio: AudioService) { }

  @HostListener('click', ['$event'])
  onClick() {
    console.log('click')
    this.audio.tick();
  }

}
