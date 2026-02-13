import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { AudioService } from '../../service/audio.service';
import { BackendService } from '../../service/backend.service';
import { StateService } from '../../service/state.service';
import { UIState } from 'saboteur-lib';
import { Subscription } from 'rxjs';
import { TypeService } from '../../service/type.service';

@Component({
  selector: 'app-root',
  templateUrl: './root.component.html',
  styleUrls: ['./root.component.scss'],
})
export class RootComponent {

  @ViewChild('audioSetup') audioSetup: ElementRef<HTMLButtonElement>;

  public widescreen: boolean = window.innerWidth > window.innerHeight;

  private audioSetupSub: Subscription;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // don't allow changing to a display UI after the Home screen
    // in case players rotate their screens
    if (this.ss.uiState == UIState.HOME) {
      this.widescreen = event.target.innerWidth > event.target.innerHeight;
    }
  }

  constructor(
    public ss: StateService,
    public backend: BackendService,
    public audio: AudioService,
    public types: TypeService
  ) { }

  ngOnInit() {
    this.ss.customGame = window.location.pathname == '/custom';
    this.audioSetupSub = this.audio.audioSetupEmitter.subscribe(() => {
      this.audioSetup.nativeElement.click();
    })
  }

  useDisplayComponent(): boolean {
    if ((this.widescreen && !this.backend.player?.isDisplay) || this.backend.player?.isDisplay) { return true; }
    else { return false; }
  }

  get showModal(): boolean {
    return this.backend.showConnectingModal || this.backend.showImgUploadModal || this.backend.showLoadingModal;
  }

  getModalMessage(): string {
    if (this.backend.showLoadingModal) {
      return 'Loading game...';
    } else if (this.backend.showConnectingModal) {
      return 'Connecting to server...';
    } else if (this.backend.showImgUploadModal) {
      return 'Uploading image...';
    }
    return 'Loading...'; // should never be returned
  }
}
