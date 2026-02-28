import { Component, Input } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { RoleName } from 'saboteur-lib';

@Component({
  selector: 'result-card',
  templateUrl: './result-card.component.html',
  styleUrls: ['./result-card.component.scss'],
  standalone: true,
  imports: [MaterialModule]
})
export class ResultCardComponent {

  @Input() role: RoleName
  @Input() inner: string;
  @Input() bgColor: string;

  get roleIcon(): string {
    return `client/assets/icons/role_icons/${this.role}.svg`
  }

  get executioner(): boolean { 
    return this.role == RoleName.EXECUTIONER;
  }

}
