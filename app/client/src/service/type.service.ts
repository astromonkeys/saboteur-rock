import { Injectable } from '@angular/core';
import { GamePhase, MarooningState, ResultState, RoleName, Team, UIState, VoteState } from 'saboteur-lib';
import { DialogType } from './toaster.service';

@Injectable({
  providedIn: 'root'
})
export class TypeService {

  // expose to component HTML
  // game states
  get UIState(): typeof UIState { return UIState; }
  get GamePhase(): typeof GamePhase { return GamePhase; }
  get VoteState(): typeof VoteState { return VoteState; }
  get ResultState(): typeof ResultState { return ResultState; }
  get MarooningState(): typeof MarooningState { return MarooningState; }
  // role types
  get RoleName(): typeof RoleName { return RoleName; }
  get Team(): typeof Team { return Team; }
  
  get DialogType(): typeof DialogType { return DialogType; }

  constructor() { }
}
