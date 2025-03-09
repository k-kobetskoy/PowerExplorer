import { Injectable } from '@angular/core';
import { Observable, map, tap, switchMap, of, shareReplay, distinctUntilChanged } from 'rxjs';
import { EntityDefinitionsResponseModel } from 'src/app/models/incoming/environment/entity-definitions-response-model';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { CacheKeys } from 'src/app/config/cache-keys';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { BaseRequestService } from 'src/app/components/query-builder/services/entity-services/abstract/base-request.service'

@Injectable({ providedIn: 'root' })
export class EntityEntityService extends BaseRequestService {

  constructor() { super(); }

  getEntities(): Observable<EntityModel[]> {

    this.getActiveEnvironmentUrl();

    const key = `${CacheKeys.Entities}`;

    return this.cacheService.getItem<EntityModel[]>(key).pipe(
      switchMap(cachedEntities => {
        if (cachedEntities) {
          return of(cachedEntities);
        }
        return this.activeEnvironmentUrl$.pipe(
          distinctUntilChanged(),
          switchMap(envUrl => {
            if (!envUrl) return of([]);

            const url = API_ENDPOINTS.entities.getResourceUrl(envUrl as string);
            return this.httpClient.get<EntityDefinitionsResponseModel>(url).pipe(
              map(({ value }) => value.map(({
                LogicalName: logicalName,
                DisplayName: { UserLocalizedLabel } = {},
                EntitySetName: entitySetName
              }) => ({
                logicalName,
                displayName: UserLocalizedLabel ? UserLocalizedLabel.Label : '',
                entitySetName
              }))),
              tap(data => this.cacheService.setItem(data, key)),
            );
          })
        );
      }),
      shareReplay(1)
    );
  }

  getEntityByLogicalName(logicalName: string): Observable<EntityModel | null> {
    return this.getEntities().pipe(
      map(entities => entities.find(entity => entity.logicalName === logicalName) || null)
    );
  }
}
