import {Component, OnDestroy} from '@angular/core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import {TextStateService} from 'src/app/services/text-state.service';
import {TextEncodingService} from 'src/app/services/text-encoding.service';

@Component({
  selector: 'app-basic-text-view',
  templateUrl: './basic-text-view.component.html',
  styleUrls: ['./basic-text-view.component.scss'],
})
export class BasicTextViewComponent implements OnDestroy {

  public ngUnsubscribe = new Subject<void>();
  public sentences: string[] = [];
  public textTitle: string;

  constructor(
    private textStateService: TextStateService,
    private textEncodingService: TextEncodingService
  ) {
    this.textStateService.getSentences().pipe(takeUntil(this.ngUnsubscribe))
        .subscribe((sentences) => {
          // Normalize text encoding for display
          this.sentences = sentences.map(sentence => 
            this.textEncodingService.normalizeTextForDisplay(sentence)
          );
        });
    textStateService.getTextTitle().pipe(takeUntil(this.ngUnsubscribe))
        .subscribe((title) => this.textTitle = title);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  isArabicText(text: string): boolean {
    return this.textEncodingService.isArabicText(text);
  }

  getTextDirection(text: string): 'rtl' | 'ltr' {
    return this.textEncodingService.getTextDirection(text);
  }

  getTextDirectionClass(text: string): string {
    return this.textEncodingService.getTextDirectionClass(text);
  }

}
