import { Injectable } from '@angular/core';
import { BaseRequestService } from 'src/app/components/query-builder/services/entity-services/abstract/base-request.service';
import { Observable, switchMap, of, map, tap, BehaviorSubject } from 'rxjs';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { BooleanModel } from 'src/app/models/incoming/boolean/boolean-model';
import { BooleanResponseModel } from 'src/app/models/incoming/boolean/boolean-response-model';
import { CacheKeys } from 'src/app/config/cache-keys';
@Injectable({ providedIn: 'root' })
export class BooleanEntityService extends BaseRequestService {

  getBooleanValuesIsLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() { super(); }

  getBooleanValues(entityLogicalName: string, attributeName: string, isLoading: boolean = false): Observable<BooleanModel> {

    return this.activeEnvironmentUrl$.pipe(
      tap(() => isLoading ? this.getBooleanValuesIsLoading$.next(true) : null), 
      switchMap(envUrl => {
        
        if (!envUrl) {
          isLoading ? this.getBooleanValuesIsLoading$.next(false) : null;
          return of(null);
        }

        const key = `${this.prepareEnvUrl(envUrl)}_${entityLogicalName}_${attributeName}_${CacheKeys.BooleanValues}`;

        const booleanOptions$ = this.cacheService.getItem<BooleanModel>(key);
    
        if (booleanOptions$.value) { 
          isLoading ? this.getBooleanValuesIsLoading$.next(false) : null;
          return booleanOptions$.asObservable(); 
        }

        const url = API_ENDPOINTS.boolean.getResourceUrl(envUrl, entityLogicalName, attributeName);

        return this.httpClient.get<BooleanResponseModel>(url).pipe(
          map(response => ({
            true: { value: response.TrueOption.Value, label: response.TrueOption.Label.UserLocalizedLabel.Label },
            false: { value: response.FalseOption.Value, label: response.FalseOption.Label.UserLocalizedLabel.Label }
          })),
          tap(data => this.cacheService.setItem<BooleanModel>(data, key)),
          tap(() => isLoading ? this.getBooleanValuesIsLoading$.next(false) : null)
        );
      })
    );
  }
}
