import { Component } from '@angular/core';
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

}
