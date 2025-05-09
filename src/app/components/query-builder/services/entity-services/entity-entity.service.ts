import { Injectable } from '@angular/core';
import { Observable, map, tap, switchMap, of, shareReplay, distinctUntilChanged, BehaviorSubject } from 'rxjs';
import { EntityDefinitionsResponseModel } from 'src/app/models/incoming/environment/entity-definitions-response-model';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { CacheKeys } from 'src/app/config/cache-keys';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { BaseRequestService } from 'src/app/components/query-builder/services/entity-services/abstract/base-request.service'

@Injectable({ providedIn: 'root' })
export class EntityEntityService extends BaseRequestService {

  constructor() { super(); }

  getEntitiesIsLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  getEntities(isLoading: boolean = false): Observable<EntityModel[]> {
    return this.activeEnvironmentUrl$.pipe(
      tap(() => isLoading ? this.getEntitiesIsLoading$.next(true) : null),
      switchMap(envUrl => {
        if (!envUrl) {
          isLoading ? this.getEntitiesIsLoading$.next(false) : null;
          return of([])
        };

        const key = `${this.prepareEnvUrl(envUrl)}_${CacheKeys.Entities}`;
        const entities$ = this.cacheService.getItem<EntityModel[]>(key);

        if (entities$.value) {
          isLoading ? this.getEntitiesIsLoading$.next(false) : null;
          return entities$.asObservable();
        }

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
          tap(() => isLoading ? this.getEntitiesIsLoading$.next(false) : null)
        );
      })
    );
  }

  getEntityByLogicalName(logicalName: string): Observable<EntityModel | null> {
    return this.getEntities().pipe(
      map(entities => entities.find(entity => entity.logicalName === logicalName) || null),
      shareReplay(1)
    );
  }
}