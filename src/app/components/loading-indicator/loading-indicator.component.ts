import { Component, HostBinding, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { LoadingIndicationService } from './services/loading-indication.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule
  ],
  selector: 'app-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LoadingIndicatorComponent implements OnInit, OnDestroy {
  @HostBinding('style.display') display: string = 'none';
  @Input() diameter: number = 50;
  @Input() loadingKey?: string;

  private sub: Subscription;
  loading$: Observable<boolean>;

  constructor(private loadingService: LoadingIndicationService) {
    this.loading$ = this.loadingService.loading$;
    this.sub = new Subscription();
  }

  ngOnInit() {
    this.loading$ = this.loadingKey ? 
      this.loadingService.getLoadingState$(this.loadingKey) : 
      this.loadingService.loading$;

    this.sub = this.loading$.subscribe(isLoading => {
      this.display = isLoading ? 'flex' : 'none';
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
