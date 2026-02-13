import { Component, ViewChild } from '@angular/core';
import { ResultState } from 'saboteur-lib';
import { BackendService } from '../../service/backend.service';
import { MaterialModule } from '../../material/material.module';
import { StateService } from '../../service/state.service';
import { ChartComponent, NgApexchartsModule } from "ng-apexcharts";
import { AvatarComponent } from '../avatar/avatar.component';
import { ResultCardComponent } from '../result-card/result-card.component';
import { ResourceService } from '../../service/resource.service';
import { TypeService } from '../../service/type.service';

@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.scss'],
  standalone: true,
  imports: [MaterialModule, NgApexchartsModule, AvatarComponent, ResultCardComponent]
})
export class ResultComponent {

  @ViewChild("chart") chart: ChartComponent;

  constructor(
    public backend: BackendService,
    public ss: StateService,
    public res: ResourceService,
    public types: TypeService
  ) { }

  next() { this.backend.game.voteResults[this.backend.game.roundIndex].tieResolved ? this.ss.resultState = ResultState.ELIMINATED : this.ss.resultState = ResultState.SUMMARY; }
}
