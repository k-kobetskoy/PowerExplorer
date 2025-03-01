import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' }) 
export class LoadingIndicationService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private requestCount = 0;
  loading$ = this.loadingSubject.asObservable();

  onRequestStarted() {
    if (this.requestCount === 0) {
      this.loadingSubject.next(true);
    }
    this.requestCount++;
  }

  onRequestFinished() {
    this.requestCount--;
    if (this.requestCount === 0) {
      this.loadingSubject.next(false);
    }
  }

  reset() {
    this.requestCount = 0;
    this.loadingSubject.next(false);
  }
}
