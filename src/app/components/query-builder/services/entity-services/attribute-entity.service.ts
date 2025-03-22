import { Injectable } from '@angular/core';
import { Observable, of, switchMap, map, catchError, filter, from, mergeMap, tap, shareReplay, forkJoin, reduce, finalize, take, concatMap, toArray } from 'rxjs';
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
    // Check if entityAttributeMap is empty
    if (!entityAttributeMap || Object.keys(entityAttributeMap).length === 0) {
      return of({});
    }
    
    // Check the number of entities and call the appropriate method
    if (Object.keys(entityAttributeMap).length === 1) {
      return this.getSpecificAttributesForSingleEntity(entityAttributeMap);
    } else {
      return this.getSpecificAttributesForMultipleEntities(entityAttributeMap);
    }
  }
  
  /**
   * Get specific attributes for a single entity
   * @param entityAttributeMap Map containing a single entity and its required attributes
   * @returns Observable with a map of entity logical name to its attribute map
   */
  private getSpecificAttributesForSingleEntity(entityAttributeMap: EntityAttributeMap): Observable<AttributeMapResult> {
    const entityLogicalName = Object.keys(entityAttributeMap)[0];
    const entityData = entityAttributeMap[entityLogicalName];
    
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          return of({});
        }
        
        // Validate attributeData
        if (!Array.isArray(entityData.attributeData)) {
          console.error(`AttributeEntityService: attributeData is not an array for entity ${entityLogicalName}`);
          return of({ [entityLogicalName]: new Map<string, AttributeModel>() });
        }
        
        // Get attribute logical names
        const attributeLogicalNames = entityData.attributeData
          .filter(attr => attr && attr.attributeLogicalName)
          .map(attr => attr.attributeLogicalName as string);
          
        if (attributeLogicalNames.length === 0) {
          return of({ [entityLogicalName]: new Map<string, AttributeModel>() });
        }
        
        // For single entity, we can directly return the result without using tuples or forkJoin
        return this.getAttributes(entityLogicalName).pipe(
          map(attributes => {
            const attributeMap = new Map<string, AttributeModel>();
            
            // Filter only the attributes we need
            const matchedAttributes = attributes.filter(attr => 
              attributeLogicalNames.includes(attr.logicalName)
            );
            
            matchedAttributes.forEach(attr => {
              attributeMap.set(attr.logicalName, attr);
            });
            
            // Return the result in the expected format
            const result: AttributeMapResult = {};
            result[entityLogicalName] = attributeMap;
            return result;
          }),
          catchError(error => {
            console.error(`AttributeEntityService: Error fetching attributes for entity ${entityLogicalName}:`, error);
            return of({ [entityLogicalName]: new Map<string, AttributeModel>() });
          })
        );
      })
    );
  }
  
  /**
   * Get specific attributes for multiple entities
   * @param entityAttributeMap Map of entities and their required attributes
   * @returns Observable with a map of entity logical names to their attribute maps
   */
  private getSpecificAttributesForMultipleEntities(entityAttributeMap: EntityAttributeMap): Observable<AttributeMapResult> {
    // Create a result map right away
    const resultMap: AttributeMapResult = {};
    
    return this.activeEnvironmentUrl$.pipe(
      take(1), // Only take one environment URL
      switchMap(envUrl => {
        if (!envUrl) {
          return of(resultMap);
        }
        
        const entityLogicalNames = Object.keys(entityAttributeMap);
        if (entityLogicalNames.length === 0) {
          return of(resultMap);
        }
        
        // Create an array of observables, one for each entity
        const entityObservables: Observable<void>[] = entityLogicalNames.map(entityLogicalName => {
          return new Observable<void>(subscriber => {
            const entityData = entityAttributeMap[entityLogicalName];
            
            // Skip invalid entity data
            if (!entityData || !Array.isArray(entityData.attributeData)) {
              resultMap[entityLogicalName] = new Map<string, AttributeModel>();
              subscriber.next();
              subscriber.complete();
              return;
            }
            
            // Get attribute names
            const attributeLogicalNames = entityData.attributeData
              .filter(attr => attr && attr.attributeLogicalName)
              .map(attr => attr.attributeLogicalName as string);
            
            if (attributeLogicalNames.length === 0) {
              resultMap[entityLogicalName] = new Map<string, AttributeModel>();
              subscriber.next();
              subscriber.complete();
              return;
            }
            
            // Get attributes for this entity
            this.getAttributes(entityLogicalName).subscribe({
              next: (attributes) => {
                try {
                  // Filter to requested attributes
                  const attributeMap = new Map<string, AttributeModel>();
                  const matchedAttributes = attributes.filter(attr => 
                    attributeLogicalNames.includes(attr.logicalName)
                  );
                  
                  // Add to map
                  matchedAttributes.forEach(attr => {
                    attributeMap.set(attr.logicalName, attr);
                  });
                  
                  // Store in result map
                  resultMap[entityLogicalName] = attributeMap;
                  
                  subscriber.next();
                  subscriber.complete();
                } catch (error) {
                  console.error(`Error processing attributes for ${entityLogicalName}:`, error);
                  resultMap[entityLogicalName] = new Map<string, AttributeModel>();
                  subscriber.next();
                  subscriber.complete();
                }
              },
              error: (error) => {
                console.error(`Error fetching attributes for ${entityLogicalName}:`, error);
                resultMap[entityLogicalName] = new Map<string, AttributeModel>();
                subscriber.next();
                subscriber.complete();
              }
            });
          }).pipe(
            finalize(() => {
              // Ensure resource cleanup
            })
          );
        });
        
        // Use forkJoin to process all entities (it will wait for all to complete)
        return forkJoin(entityObservables).pipe(
          map(() => resultMap),
          catchError(error => {
            console.error('Error processing entities:', error);
            return of(resultMap);
          })
        );
      }),
      catchError(error => {
        console.error('Error retrieving environment URL:', error);
        return of(resultMap);
      })
    );
  }
}