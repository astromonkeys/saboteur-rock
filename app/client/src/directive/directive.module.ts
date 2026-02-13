import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudibleClickDirective } from './audible-click.directive';

@NgModule({
  declarations: [
    AudibleClickDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AudibleClickDirective
  ]
})
export class DirectiveModule { }
