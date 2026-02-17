import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { RootComponent } from './component/root/root.component';
import { PlayerComponent } from './component/player/player.component';
import { VoteComponent } from './component/vote/vote.component';
import { ResultComponent } from './component/result/result.component';
import { MaterialModule } from './material/material.module';
import { CdkColumnDef } from '@angular/cdk/table';
import { DisplayComponent } from './component/display/display.component';
import { AvatarComponent } from './component/avatar/avatar.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { VictoryComponent } from './component/victory/victory.component';
import { ResultCardComponent } from './component/result-card/result-card.component';
import { OptionsComponent } from './component/options/options.component';

const config: SocketIoConfig = { url: 'http://10.0.0.248:8080', options: {} };

@NgModule({
  declarations: [
    RootComponent,
    DisplayComponent,
    OptionsComponent,
  ],
  imports: [
    MaterialModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    SocketIoModule.forRoot(config),
    NgApexchartsModule,
    PlayerComponent,
    VoteComponent,
    ResultComponent,
    AvatarComponent,
    VictoryComponent,
    ResultCardComponent,
  ],
  providers: [CdkColumnDef],
  bootstrap: [RootComponent]
})
export class AppModule { }
