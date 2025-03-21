import { Injectable } from '@angular/core';
import { Observable, of, switchMap, map, catchError, filter, from, mergeMap, tap, shareReplay, forkJoin } from 'rxjs';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeResponseModel } from 'src/app/models/incoming/attrubute/attribute-response-model';
import { CacheKeys } from 'src/app/config/cache-keys';
import { BaseRequestService } from 'src/app/components/query-builder/services/entity-services/abstract/base-request.service';

// Add these interfaces for the entity attribute map
interface AttributeData {
  attributeLogicalName: string | null;
  alias: string | null;
}

interface EntityAttributeData {
  entityAlias: string | null;
  attributeData: AttributeData[];
}

export interface EntityAttributeMap {
  [entityLogicalName: string]: EntityAttributeData;
}

export interface AttributeMapResult {
  [entityLogicalName: string]: Map<string, AttributeModel>;
}

@Injectable({ providedIn: 'root' })
export class AttributeEntityService extends BaseRequestService {

  constructor() {
    super();
  }

  getAttributes(entityLogicalName: string): Observable<AttributeModel[]> {

    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) return of([]);

        const normalizedEntityName = entityLogicalName.trim().toLowerCase();
        const cacheKey = `${this.prepareEnvUrl(envUrl)}_${CacheKeys.EntityAttributes}_${normalizedEntityName}`;
        const attributes$ = this.cacheService.getItem<AttributeModel[]>(cacheKey);

        if (attributes$.value) { return attributes$.asObservable(); }

        const url = API_ENDPOINTS.attributes.getResourceUrl(envUrl, entityLogicalName);

        return this.httpClient.get<AttributeResponseModel>(url).pipe(
          map(({ value }) => value.map(({
            LogicalName: logicalName,
            DisplayName: { UserLocalizedLabel } = {},
            AttributeType: attributeType }): AttributeModel =>
          ({
            logicalName,
            displayName: UserLocalizedLabel ? UserLocalizedLabel.Label : '',
            attributeType
          }))),
          tap(data => this.cacheService.setItem(data, cacheKey))
        );
      }));
  }

  /**
   * Get specific attributes for multiple entities based on the entityAttributeMap
   * @param entityAttributeMap Map of entities and their required attributes
   * @returns Observable with a map of entity logical names to their attribute maps
   */
  getSpecificAttributes(entityAttributeMap: EntityAttributeMap): Observable<AttributeMapResult> {
    // Keep just the essential log
    console.log('AttributeEntityService: getSpecificAttributes called');
    
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          return of({});
        }
        
        // Create an observable for each entity in the map
        const entityObservables: Record<string, Observable<[string, Map<string, AttributeModel>]>> = {};
        
        Object.entries(entityAttributeMap).forEach(([entityLogicalName, entityData]) => {
          // Get the list of attribute logical names we need to fetch for this entity
          if (!Array.isArray(entityData.attributeData)) {
            console.error(`AttributeEntityService: attributeData is not an array for entity ${entityLogicalName}`);
            entityObservables[entityLogicalName] = of([entityLogicalName, new Map<string, AttributeModel>()]);
            return;
          }
          
          const attributeLogicalNames = entityData.attributeData
            .filter(attr => attr && attr.attributeLogicalName) // Ensure it's valid
            .map(attr => attr.attributeLogicalName as string);
            
          if (attributeLogicalNames.length === 0) {
            entityObservables[entityLogicalName] = of([entityLogicalName, new Map<string, AttributeModel>()]);
            return;
          }
          
          // Fetch all attributes for this entity and filter the ones we need
          entityObservables[entityLogicalName] = this.getAttributes(entityLogicalName).pipe(
            map(attributes => {
              const attributeMap = new Map<string, AttributeModel>();
              
              // Filter only the attributes we need
              const matchedAttributes = attributes.filter(attr => attributeLogicalNames.includes(attr.logicalName));
              
              matchedAttributes.forEach(attr => {
                attributeMap.set(attr.logicalName, attr);
              });
              
              return [entityLogicalName, attributeMap] as [string, Map<string, AttributeModel>];
            }),
            catchError(error => {
              console.error(`AttributeEntityService: Error fetching attributes for entity ${entityLogicalName}:`, error);
              return of([entityLogicalName, new Map<string, AttributeModel>()] as [string, Map<string, AttributeModel>]);
            })
          );
        });
        
        // If no entities to process
        if (Object.keys(entityObservables).length === 0) {
          return of({});
        }
        
        // Special case for single entity (most common and simpler case)
        if (Object.keys(entityObservables).length === 1) {
          const entityName = Object.keys(entityObservables)[0];
          const entityObservable = entityObservables[entityName];
          
          return entityObservable.pipe(
            map(([entityLogicalName, attributeMap]) => {
              const result: AttributeMapResult = {};
              result[entityLogicalName] = attributeMap;
              return result;
            }),
            catchError(error => {
              console.error('AttributeEntityService: Error in single entity path:', error);
              return of({});
            })
          );
        }
        
        // Multiple entities case uses forkJoin
        return forkJoin(Object.values(entityObservables)).pipe(
          map(results => {
            const attributeMapResult: AttributeMapResult = {};
            results.forEach(([entityLogicalName, attributeMap]) => {
              attributeMapResult[entityLogicalName] = attributeMap;
            });
            return attributeMapResult;
          }),
          catchError(error => {
            console.error('AttributeEntityService: Critical error in forkJoin:', error);
            return of({} as AttributeMapResult);
          })
        );
      })
    );
  }
}