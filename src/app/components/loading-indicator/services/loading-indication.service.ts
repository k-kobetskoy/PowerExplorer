import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingIndicationService {
  private loadingStates = new Map<string, BehaviorSubject<boolean>>();
  private defaultLoading = new BehaviorSubject<boolean>(false);

  get loading$() {
    return this.defaultLoading.asObservable();
  }

  getLoadingState$(key: string) {
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(key, new BehaviorSubject<boolean>(false));
    }
    return this.loadingStates.get(key)!.asObservable();
  }

  loadingOn(key?: string) {
    if (key) {
      const state = this.loadingStates.get(key) || new BehaviorSubject<boolean>(false);
      this.loadingStates.set(key, state);
      state.next(true);
    } else {
      this.defaultLoading.next(true);
    }
  }

  loadingOff(key?: string) {
    if (key) {
      const state = this.loadingStates.get(key);
      if (state) {
        state.next(false);
      }
    } else {
      this.defaultLoading.next(false);
    }
  }
}
