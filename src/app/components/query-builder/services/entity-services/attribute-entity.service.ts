import { Injectable } from '@angular/core';
import { Observable, catchError, concatMap, delay, map, of, switchMap, tap, timer } from 'rxjs';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeResponseModel } from 'src/app/models/incoming/attrubute/attribute-response-model';
import { CacheKeys } from 'src/app/config/cache-keys';
import { BaseRequestService } from 'src/app/components/query-builder/services/entity-services/abstract/base-request.service';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AttributeEntityService extends BaseRequestService {
  constructor() { 
    super(); 
    // Initialize activeEnvironmentUrl$ immediately in the constructor
    this.getActiveEnvironmentUrl();
  }
  
  getAttributes(entityLogicalName: string): Observable<AttributeModel[]> {
    if (!entityLogicalName || entityLogicalName.trim() === '') {
      console.error('Entity logical name is required');
      return of([]);
    }

    const cacheKey = `${CacheKeys.EntityAttributes}_${entityLogicalName}`;
    const attributes$ = this.cacheService.getItem<AttributeModel[]>(cacheKey);

    if (attributes$.value) {
      return attributes$.asObservable();
    }

    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          return of([]);
        }
        
        const url = API_ENDPOINTS.attributes.getResourceUrl(envUrl, entityLogicalName);
        
        return this.httpClient.get<AttributeResponseModel>(url).pipe(
          map(response => {
            if (!response || !response.value) {
              return [];
            }
            
            const attributes = response.value.map(attr => {
              return {
                logicalName: attr.LogicalName,
                displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
                attributeType: attr.AttributeType
              } as AttributeModel;
            });
            
            this.cacheService.setItem(attributes, cacheKey);
            return attributes;
          }),
          catchError((error: HttpErrorResponse) => {
            console.error(`Error fetching attributes for ${entityLogicalName}:`, error);
            return of([]);
          })
        );
      }),
      catchError(error => {
        console.error(`Error in attribute retrieval pipeline for ${entityLogicalName}:`, error);
        return of([]);
      })
    );
  }
}