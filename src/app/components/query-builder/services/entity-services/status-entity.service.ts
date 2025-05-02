import { Injectable } from '@angular/core';
import { Observable, switchMap, of, map, tap, BehaviorSubject } from 'rxjs';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { BaseRequestService } from './abstract/base-request.service';
import { StateResponseModel, StateModel } from 'src/app/models/incoming/status/state-response-model';
import { CacheKeys } from 'src/app/config/cache-keys';

@Injectable({ providedIn: 'root' })
export class StatusEntityService extends BaseRequestService {

  getStateOrStatusCodeValuesIsLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() { super(); }
  

  getStateOrStatusCodeValues(entityLogicalName: string, stateOrStatusCodeName: string, isLoading: boolean = false): Observable<StateModel[]> {
    return this.activeEnvironmentUrl$.pipe(
      tap(() => isLoading ? this.getStateOrStatusCodeValuesIsLoading$.next(true) : null),
      switchMap(envUrl => {
        if (!envUrl) {
          isLoading ? this.getStateOrStatusCodeValuesIsLoading$.next(false) : null;
          return of(null);
        }

        const key = `${this.prepareEnvUrl(envUrl)}_${entityLogicalName}_${stateOrStatusCodeName}_${CacheKeys.StateStatus}`;

        const statueOrStatusCodeOptions$ = this.cacheService.getItem<StateModel[]>(key);

        if (statueOrStatusCodeOptions$.value) { 
          isLoading ? this.getStateOrStatusCodeValuesIsLoading$.next(false) : null;
          return statueOrStatusCodeOptions$.asObservable(); 
        }


        let url: string;
        if (stateOrStatusCodeName === 'statecode') {
          url = API_ENDPOINTS.statecode.getResourceUrl(envUrl, entityLogicalName, stateOrStatusCodeName);
        } else {
          url = API_ENDPOINTS.statuscode.getResourceUrl(envUrl, entityLogicalName, stateOrStatusCodeName);
        }

        return this.httpClient.get<StateResponseModel>(url).pipe(
          map(({ Options }): StateModel[] => Options.map(({ Value, Label }): StateModel =>
            ({ value: Value, label: Label?.UserLocalizedLabel ? Label.UserLocalizedLabel.Label : '' }))),
          tap(data => this.cacheService.setItem<StateModel[]>(data, key)),
          tap(() => isLoading ? this.getStateOrStatusCodeValuesIsLoading$.next(false) : null)
        );
      })
    );
  }
}
