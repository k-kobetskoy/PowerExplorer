import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, tap, catchError, BehaviorSubject } from 'rxjs';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { CacheKeys } from 'src/app/config/cache-keys';
import { BaseRequestService } from './abstract/base-request.service';
import { LinkEntityResponseModel, RelationshipModel, RelationshipType } from 'src/app/models/incoming/link/link-entity-response-model';

@Injectable({ providedIn: 'root' })
export class LinkEntityService extends BaseRequestService {

  getLinkEntitiesIsLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() { super(); }

  getLinkEntities(entityLogicalName: string, isLoading: boolean = false): Observable<LinkEntityResponseModel> {
    return this.activeEnvironmentUrl$.pipe(
      tap(() => isLoading ? this.getLinkEntitiesIsLoading$.next(true) : null),
      switchMap(envUrl => {
          if (!envUrl) {
          isLoading ? this.getLinkEntitiesIsLoading$.next(false) : null;
          return of({ OneToManyRelationships: [], ManyToOneRelationships: [] });
        }

        const key = `${this.prepareEnvUrl(envUrl)}_${entityLogicalName}_${CacheKeys.LinkEntities}`;

        const linkEntities$ = this.cacheService.getItem<LinkEntityResponseModel>(key);

        if (linkEntities$.value) { 
          isLoading ? this.getLinkEntitiesIsLoading$.next(false) : null;
          return linkEntities$.asObservable(); 
        }

        const url = API_ENDPOINTS.link.getResourceUrl(envUrl, entityLogicalName);

        return this.httpClient.get<any>(url).pipe(
          map(response => {
            const oneToManyRelationships: RelationshipModel[] = this.mapToRelationshipModel(
              response.OneToManyRelationships || [],
              RelationshipType.OneToMany
            );

            const manyToOneRelationships: RelationshipModel[] = this.mapToRelationshipModel(
              response.ManyToOneRelationships || [],
              RelationshipType.ManyToOne
            );

            return {
              OneToManyRelationships: oneToManyRelationships,
              ManyToOneRelationships: manyToOneRelationships
            };
          }),
          tap(data => { this.cacheService.setItem(data, key); }),
          tap(() => isLoading ? this.getLinkEntitiesIsLoading$.next(false) : null),
          catchError(error => {
            console.error('Error fetching link entities:', error);
            return of({ OneToManyRelationships: [], ManyToOneRelationships: [] });
          })
        );
      })
    );
  }

  private mapToRelationshipModel(rawRelationships: any[], relationshipType: RelationshipType): RelationshipModel[] {
    if (!rawRelationships || !rawRelationships.length) {
      return [];
    }

    return rawRelationships.map(rel => ({
      ReferencedEntityName: rel.ReferencedEntity || '',
      ReferencedEntityNavigationPropertyName: rel.ReferencedEntityNavigationPropertyName || '',
      ReferencedAttribute: rel.ReferencedAttribute || '',
      
      SchemaName: rel.SchemaName || '',

      ReferencingEntityName: rel.ReferencingEntity || '',
      ReferencingEntityNavigationPropertyName: rel.ReferencingEntityNavigationPropertyName || '',
      ReferencingAttribute: rel.ReferencingAttribute || '',
      
      RelationshipType: relationshipType
    }));
  }
}
