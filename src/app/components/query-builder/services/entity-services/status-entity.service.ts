import { Injectable } from '@angular/core';
import { Observable, switchMap, of, map, tap } from 'rxjs';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { BaseRequestService } from './abstract/base-request.service';
import { StateResponseModel, StateModel } from 'src/app/models/incoming/status/state-response-model';
import { CacheKeys } from 'src/app/config/cache-keys';

@Injectable({ providedIn: 'root' })
export class StatusEntityService extends BaseRequestService {

  constructor() { super(); }

  getStateOrStatusCodeValues(entityLogicalName: string, stateOrStatusCodeName: string): Observable<StateModel[]> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) return of(null);

        const key = `${this.prepareEnvUrl(envUrl)}_${entityLogicalName}_${stateOrStatusCodeName}_${CacheKeys.StateStatus}`;

        const statueOrStatusCodeOptions$ = this.cacheService.getItem<StateModel[]>(key);

        if (statueOrStatusCodeOptions$.value) { return statueOrStatusCodeOptions$.asObservable(); }


        let url: string;
        if (stateOrStatusCodeName === 'statecode') {
          url = API_ENDPOINTS.statecode.getResourceUrl(envUrl, entityLogicalName, stateOrStatusCodeName);
        } else {
          url = API_ENDPOINTS.statuscode.getResourceUrl(envUrl, entityLogicalName, stateOrStatusCodeName);
        }

        return this.httpClient.get<StateResponseModel>(url).pipe(
          map(({ Options }): StateModel[] => Options.map(({ Value, Label }): StateModel =>
            ({ value: Value, label: Label?.UserLocalizedLabel ? Label.UserLocalizedLabel.Label : '' }))),
          tap(data => this.cacheService.setItem<StateModel[]>(data, key)));
      })
    );
  }
}
