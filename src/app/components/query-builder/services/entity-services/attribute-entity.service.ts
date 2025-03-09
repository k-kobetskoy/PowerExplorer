import { Injectable } from '@angular/core';
import { Observable, of, switchMap, map, catchError, filter, from, mergeMap, tap } from 'rxjs';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeResponseModel } from 'src/app/models/incoming/attrubute/attribute-response-model';
import { CacheKeys } from 'src/app/config/cache-keys';
import { BaseRequestService } from 'src/app/components/query-builder/services/entity-services/abstract/base-request.service';
import { HttpErrorResponse } from '@angular/common/http';
import { QueryNode } from '../../models/query-node';
import { ValidationResult } from '../validation.service';

@Injectable({ providedIn: 'root' })
export class AttributeEntityService extends BaseRequestService {
  // Track entity validation state to avoid unnecessary calls
  private validEntityCache = new Set<string>();
  
  constructor() { 
    super(); 
    this.getActiveEnvironmentUrl();
  }
  
  /**
   * Get attributes for an entity, but only if the entity is valid
   * @param entityLogicalName The logical name of the entity
   * @param entityNode Optional entity node to check validation state
   */
  getAttributes(entityLogicalName: string, entityNode?: QueryNode): Observable<AttributeModel[]> {
    if (!entityLogicalName || entityLogicalName.trim() === '') {
      console.error('Entity logical name is required');
      return of([]);
    }
    
    // Normalize entity name for consistent caching
    const normalizedEntityName = entityLogicalName.trim().toLowerCase();
    
    // Check if we've already validated this entity
    if (this.validEntityCache.has(normalizedEntityName)) {
      console.debug(`Using cached attributes for entity: ${normalizedEntityName}`);
      return this.fetchAttributesFromCache(normalizedEntityName);
    }
    
    // If entity node is provided, check its validation state first
    if (entityNode) {
      console.debug(`Checking validation state for entity: ${normalizedEntityName}`);
      return entityNode.getValidationResult().pipe(
        // Only proceed if the entity is valid
        filter((result: ValidationResult) => {
          const isValid = result.isValid;
          console.debug(`Entity validation result for ${normalizedEntityName}: ${isValid ? 'valid' : 'invalid'}`);
          return isValid;
        }),
        tap(() => {
          // Cache the valid entity name to avoid rechecking
          console.debug(`Adding ${normalizedEntityName} to valid entity cache`);
          this.validEntityCache.add(normalizedEntityName);
        }),
        // Then fetch the attributes
        switchMap(() => this.fetchAttributesFromCache(normalizedEntityName))
      );
    }
    
    // If no entity node is provided, proceed with the fetch
    // but mark this as potentially wasteful
    console.warn(`Fetching attributes for '${normalizedEntityName}' without validation check`);
    return this.fetchAttributesFromCache(normalizedEntityName);
  }
  
  /**
   * Check if an entity exists and is valid
   * @param entityLogicalName The logical name of the entity to check
   */
  checkEntityExists(entityLogicalName: string): Observable<boolean> {
    if (!entityLogicalName || entityLogicalName.trim() === '') {
      return of(false);
    }
    
    // Normalize entity name for consistent caching
    const normalizedEntityName = entityLogicalName.trim().toLowerCase();
    
    // If we've already validated this entity, return true
    if (this.validEntityCache.has(normalizedEntityName)) {
      console.debug(`Entity ${normalizedEntityName} already validated`);
      return of(true);
    }
    
    console.debug(`Checking if entity exists: ${normalizedEntityName}`);
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          console.warn('No active environment URL');
          return of(false);
        }
        
        // Use a lightweight call to check if the entity exists
        // Use the attributes endpoint with a limit of 1 to check if entity exists
        const url = API_ENDPOINTS.attributes.getResourceUrl(envUrl, normalizedEntityName) + '&$top=1';
        
        return this.httpClient.get(url).pipe(
          map(() => {
            // If the call succeeds, the entity exists
            console.debug(`Entity ${normalizedEntityName} exists, adding to cache`);
            this.validEntityCache.add(normalizedEntityName);
            return true;
          }),
          catchError(() => {
            console.warn(`Entity ${normalizedEntityName} does not exist`);
            return of(false);
          })
        );
      })
    );
  }
  
  /**
   * Clear the entity validation cache
   */
  clearEntityValidationCache(): void {
    console.debug(`Clearing entity validation cache with ${this.validEntityCache.size} entries`);
    this.validEntityCache.clear();
  }
  
  /**
   * Fetch attributes from cache or API
   */
  private fetchAttributesFromCache(entityLogicalName: string): Observable<AttributeModel[]> {
    // Normalize entity name for consistent caching
    const normalizedEntityName = entityLogicalName.trim().toLowerCase();
    const cacheKey = `${CacheKeys.EntityAttributes}_${normalizedEntityName}`;
    const attributes$ = this.cacheService.getItem<AttributeModel[]>(cacheKey);

    if (attributes$.value) {
      console.debug(`Found cached attributes for entity: ${normalizedEntityName}`);
      return attributes$.asObservable();
    }

    console.debug(`Fetching attributes from API for entity: ${normalizedEntityName}`);
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          console.warn('No active environment URL');
          return of([]);
        }
        
        const url = API_ENDPOINTS.attributes.getResourceUrl(envUrl, normalizedEntityName);
        
        return this.httpClient.get<AttributeResponseModel>(url).pipe(
          map(response => {
            if (!response || !response.value) {
              console.warn(`No attributes found for entity: ${normalizedEntityName}`);
              return [];
            }
            
            const attributes = response.value.map(attr => ({
              logicalName: attr.LogicalName,
              displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
              attributeType: attr.AttributeType
            } as AttributeModel));
            
            console.debug(`Caching ${attributes.length} attributes for entity: ${normalizedEntityName}`);
            this.cacheService.setItem(attributes, cacheKey);
            
            return attributes;
          }),
          catchError((error: HttpErrorResponse) => {
            console.error(`Error fetching attributes for ${normalizedEntityName}:`, error.message);
            return of([]);
          })
        );
      })
    );
  }
}