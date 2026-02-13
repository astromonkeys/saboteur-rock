import { Component, Input } from '@angular/core';
import { MaterialModule } from '../../material/material.module';

@Component({
  selector: 'result-card',
  templateUrl: './result-card.component.html',
  styleUrls: ['./result-card.component.scss'],
  standalone: true,
  imports: [MaterialModule]
})
export class ResultCardComponent {

  @Input() inner: string;
  @Input() bgColor: string;

}
