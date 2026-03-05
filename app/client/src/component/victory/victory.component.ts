import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { Player, Team } from 'saboteur-lib';
import { AvatarComponent } from '../avatar/avatar.component';
import { BackendService } from '../../service/backend.service';
import { MaterialModule } from '../../material/material.module';
import { ResourceService } from '../../service/resource.service';
import { TypeService } from '../../service/type.service';
import { BouncingImgComponent } from '../bouncing-img/bouncing-img.component';

@Component({
  selector: 'app-victory',
  templateUrl: './victory.component.html',
  styleUrls: ['./victory.component.scss'],
  standalone: true,
  imports: [MaterialModule, AvatarComponent, BouncingImgComponent]
})
export class VictoryComponent {

  @Input() display: boolean = false;

  constructor(
    public backend: BackendService,
    public res: ResourceService,
    public types: TypeService
  ) { }

}
