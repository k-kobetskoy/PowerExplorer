import { Injectable } from '@angular/core';
import { BaseRequestService } from 'src/app/components/query-builder/services/entity-services/abstract/base-request.service';
import { switchMap, of, map, tap, Observable } from 'rxjs';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { PicklistResponseModel } from 'src/app/models/incoming/picklist/picklist-response-model';
import { PicklistModel } from 'src/app/models/incoming/picklist/picklist-model';
import { CacheKeys } from 'src/app/config/cache-keys';
@Injectable({ providedIn: 'root' })
export class PicklistEntityService extends BaseRequestService {

  constructor() { super(); }

  getOptions(entityLogicalName: string, attributeName: string, attributeType: string): Observable<PicklistModel[]> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) return of([]);

        const key = `${this.prepareEnvUrl(envUrl)}_${entityLogicalName}_${attributeName}_${CacheKeys.Options}`;

        const options$ = this.cacheService.getItem<PicklistModel[]>(key);

        if (options$.value) {
          return options$.asObservable();
        }

        const url = API_ENDPOINTS.picklist.getResourceUrl(envUrl, entityLogicalName, attributeName, attributeType);

        return this.httpClient.get<PicklistResponseModel>(url).pipe(
          map(({ Options }) => Options.map(({ Value, Label }): PicklistModel =>
            ({ value: Value, label: Label?.UserLocalizedLabel ? Label.UserLocalizedLabel.Label : '' }))),
          tap(data => this.cacheService.setItem<PicklistModel[]>(data, key))
        );
      })
    );
  }
}
