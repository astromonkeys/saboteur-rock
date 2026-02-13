import { Injectable } from '@angular/core';
import { UIState, VoteState, ResultState, MarooningState, VoteResults, Player } from 'saboteur-lib';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexXAxis, ApexPlotOptions, ApexTooltip, ApexLegend, ApexTitleSubtitle } from "ng-apexcharts";
import { ResourceService } from './resource.service';

export type ChartOptions = {
  title: ApexTitleSubtitle;
  series: ApexAxisChartSeries;
  colors: string[];
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  xaxis: ApexXAxis;
}

@Injectable({
  providedIn: 'root'
})
export class StateService {

  customGame: boolean = false;

  cardFlipped: boolean = false;
  showOptions: boolean = false;
  showAbilityDescription: boolean = true;

  public uiState: UIState = UIState.HOME;
  public voteState: VoteState = VoteState.BALLOT;
  public resultState: ResultState = ResultState.ABILITY;
  public marooningState: MarooningState = MarooningState.NORMAL;

  private roundResults: VoteResults;
  public chartOptions: Partial<ChartOptions>;

  constructor(
    private res: ResourceService
  ) { }

  showTopBanner(): boolean {
    return this.showTipMenu || this.showOptions;
  }

  showLucasTip(custom: boolean) {
    return custom ? true : this.uiState != UIState.LOBBY;
  }

  get showTipMenu() {
    switch (this.uiState) {
      case UIState.HOME:
      case UIState.CREATE_SESSION:
      case UIState.CUSTOM_SESSION:
      case UIState.JOIN_SESSION:
      case UIState.VICTORY:
        return false;
      default:
        return true;
    }
  }

  barColor(player: Player): string {
    if (this.roundResults.veto || !this.roundResults.tieResolved) { return this.res.graphNormal; }
    else if ((player.name == this.roundResults.eliminated?.name || player.name == this.roundResults.executed?.name) &&
      player.name != this.roundResults.sos?.name) { return this.res.graphElim; }
    else { return this.res.graphNormal; }
  }

  barColors(votes: [Player, number][]): string[] {
    let colors: string[] = [];
    for (let player of votes.map((el) => { return el[0]; })) {
      colors.push(this.barColor(player));
    }
    return colors;
  }

  initGraph(results: VoteResults, votes: [Player, number][], display: boolean) {
    this.roundResults = results;
    this.chartOptions = {
      title: {
        text: "Votes Cast",
        align: 'center',
        offsetY: 15
      },
      series: [
        {
          name: "Votes",
          data: votes.map((el) => { return el[1]; })
        }
      ],
      colors: this.barColors(votes),
      chart: {
        type: "bar",
        height: display ? 350 : 250,
        toolbar: {
          show: false
        }
      },
      legend: {
        show: false
      },
      plotOptions: {
        bar: {
          distributed: true,
          horizontal: true
        }
      },
      dataLabels: {
        enabled: true
      },
      tooltip: {
        enabled: false
      },
      xaxis: {
        categories: votes.map((el) => { return el[0].name; }),
        labels: {
          show: false
        },
        axisTicks: {
          show: false
        }
      }
    };
  }

}
