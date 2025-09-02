import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { OpusFormatSelectorComponent } from './opus-format-selector.component';

@NgModule({
  declarations: [
    OpusFormatSelectorComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [
    OpusFormatSelectorComponent
  ]
})
export class OpusFormatSelectorModule { }

