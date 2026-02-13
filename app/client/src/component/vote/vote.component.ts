import { Component, } from '@angular/core';
import { BackendService } from '../../service/backend.service';
import { StateService } from '../../service/state.service';
import { VoteState, Player, RoleName, PASSIVE_ROLES, Vote } from 'saboteur-lib';
import { MaterialModule } from '../../material/material.module';
import { AvatarComponent } from '../avatar/avatar.component';
import { ResourceService } from '../../service/resource.service';
import { DialogType, ToasterService } from '../../service/toaster.service';
import { TypeService } from '../../service/type.service';

@Component({
  selector: 'app-vote',
  templateUrl: './vote.component.html',
  styleUrls: ['./vote.component.scss'],
  standalone: true,
  imports: [MaterialModule, AvatarComponent]
})
export class VoteComponent {

  get votablePlayers(): Player[] { return this.backend.game.votable; }

  vote: Vote = new Vote();
  tiebreaker: Player;

  constructor(
    public ss: StateService,
    public backend: BackendService,
    public res: ResourceService,
    public toast: ToasterService,
    public types: TypeService
  ) { }

  ngAfterContentChecked() {
    if (!this.ss.voteState) { this.ss.voteState = VoteState.BALLOT; }
  }

  closeVoteDialog() {
    this.toast.dialog(DialogType.CloseVoteDialog);
  }

  finishBallot() {
    let usedAbility = (this.backend.player.role.ability == RoleName.EXECUTIONER && (this.backend.game.usedKill || (this.backend.game.roundIndex == 0 && !this.backend.game.options.roundOneElimination)) ||
      (this.backend.player.role.ability == RoleName.PRESIDENT && this.backend.game.usedVeto) ||
      (this.backend.player.role.ability == RoleName.MEDIC && this.backend.game.disableSos))
    if (!usedAbility && PASSIVE_ROLES.indexOf(this.backend.player.role.ability) == -1) { this.ss.voteState = VoteState.ABILITY; }
    else { this.complete(); }
  }

  complete() {
    this.ss.voteState = VoteState.WAIT;
    this.vote.owner = this.backend.player;
    if (this.vote.abilityTarget?.socketID == -1) { this.vote.abilityTarget = null; }
    this.backend.castVote(this.vote);
  }

  tiebreak() {
    this.ss.voteState = VoteState.WAIT;
    this.backend.tiebreak(this.tiebreaker);
  }
}
