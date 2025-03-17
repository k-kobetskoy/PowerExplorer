import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, catchError, combineLatest, forkJoin, tap } from 'rxjs';
import { BaseRequestService } from './entity-services/abstract/base-request.service';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { XmlExecuteResultModel } from 'src/app/models/incoming/xml-execute-result/xml-execute-result-model';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { NodeTreeService } from './node-tree.service';
import { AttributeEntityService } from './entity-services/attribute-entity.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { QueryNode } from '../models/query-node';

interface FetchXmlQueryOptions {
  maxPageSize?: number;
  includeAnnotations?: boolean;
  timeout?: number;
  includeFieldTypes?: boolean;
}

export interface FieldTypeInfo {
  value: any;
  type: string;
  displayName?: string;
  FormattedValue?: string;
  associatednavigationproperty?: string;
  lookuplogicalname?: string;
  [key: string]: any; // For any additional annotations
}

export interface TypedResultItem {
  [key: string]: any | FieldTypeInfo;
}

@Injectable({ providedIn: 'root' })
export class XmlExecutorService extends BaseRequestService {
  private readonly DEFAULT_PAGE_SIZE = 100;

  constructor(
    private nodeTreeService: NodeTreeService,
    private attributeEntityService: AttributeEntityService
  ) { super(); }

  executeXmlRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}): Observable<Object[]> {
    if (!xml || !entityNode) {
      console.error('XML and entity name are required');
      return of([]);
    }

    const xmlOptions = this.extractQueryOptions(xml);
    const mergedOptions = { ...xmlOptions, ...options };

    return this.executeRequest(xml, entityNode, mergedOptions);
  }

  private extractQueryOptions(xml: string): FetchXmlQueryOptions {
    try {
      const options: FetchXmlQueryOptions = {};

      const fetchNode = this.nodeTreeService.getNodeTree().value.root;
      if (!fetchNode) {
        return options;
      }

      const topAttribute = fetchNode.attributes$.value.find(attr => attr.editorName === 'top');
      if (topAttribute?.value$.value) {
        options.maxPageSize = parseInt(topAttribute.value$.value, 10);
      }

      const hasAnnotations = this.nodeTreeService.getNodeTree().value.root.attributes$.value
        .some(attr => attr.editorName === 'name' && attr.value$.value?.includes('annotation'));

      if (hasAnnotations) {
        options.includeAnnotations = true;
      }

      return options;
    } catch (error) {
      console.error('Error extracting options from node tree:', error);
      return {};
    }
  }

  private sanitizeForTransmission(xml: string): string {
    return xml
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private executeRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions): Observable<Object[]> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          console.error('No active environment URL found');
          return of(null);
        }

        const sanitizedXml = this.sanitizeForTransmission(xml);
        const encodedXml = encodeURIComponent(sanitizedXml);
        const url = API_ENDPOINTS.execute.getResourceUrl(envUrl, entityNode.entitySetName$.value, encodedXml);
        const requestOptions = this.buildRequestOptions(options);

        return this.httpClient.get<XmlExecuteResultModel>(url, requestOptions).pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Error executing XML request:', error.message);
            return of(null);
          })
        );
      }),
      tap(result => console.log(result)),
      switchMap(result => {
        if (!result?.value?.length) {
          return of([]);
        }

        const entityName = entityNode.attributes$.value.filter(attr => attr.editorName === 'name')[0].value$.value;

        return this.attributeEntityService.getAttributes(entityName).pipe(
          map(attributes => {
            if (!attributes.length) {
              return this.normalizeData(result.value);
            }

            const attributeMap = new Map<string, AttributeModel>();
            attributes.forEach(attr => attributeMap.set(attr.logicalName, attr));

            return this.normalizeDataWithTypes(result.value, attributeMap);
          }),
          catchError(error => {
            return of(this.normalizeData(result.value));
          })
        );
      })
    );
  }

  private buildRequestOptions(options: FetchXmlQueryOptions): { headers: HttpHeaders } {
    const headers = new HttpHeaders({
      'Prefer': [
        `odata.maxpagesize=${options.maxPageSize || this.DEFAULT_PAGE_SIZE}`,
        'odata.include-annotations="*"'
      ].filter(Boolean).join(',')
    });

    return { headers };
  }

  private normalizeDataWithTypes<T extends { [key: string]: any }>(data: T[], attributeMap: Map<string, AttributeModel>): TypedResultItem[] {
    if (!data?.length) return [];

    console.log('Normalizing data with types and annotations');

    // Get all keys from the first item, including annotation keys
    const firstItem = data[0];
    const allKeys = Object.keys(firstItem).filter(key => key !== '@odata.etag');

    // Group keys by base field name (without annotations)
    const fieldGroups = new Map<string, string[]>();

    allKeys.forEach(key => {
      // Check if this is an annotation key
      if (key.includes('@')) {
        const baseKey = key.split('@')[0];
        if (!fieldGroups.has(baseKey)) {
          fieldGroups.set(baseKey, []);
        }
        fieldGroups.get(baseKey).push(key);
      } else {
        // Base field
        if (!fieldGroups.has(key)) {
          fieldGroups.set(key, []);
        }
      }
    });

    console.log(`Found ${fieldGroups.size} unique fields with their annotations`);

    return data.map(item => {
      const normalizedItem: TypedResultItem = {};

      // Process each field group (base field + its annotations)
      fieldGroups.forEach((annotationKeys, baseKey) => {
        // Handle lookup fields (they start with underscore and end with _value)
        let fieldKey = baseKey;
        let isLookup = false;

        if (baseKey.startsWith('_') && baseKey.endsWith('_value')) {
          isLookup = true;
          // Try to get the logical name from associatednavigationproperty annotation
          const navPropKey = `${baseKey}@Microsoft.Dynamics.CRM.associatednavigationproperty`;
          let logicalName = '';

          if (item[navPropKey]) {
            // Use associatednavigationproperty if available
            logicalName = String(item[navPropKey]).toLowerCase();
          } else {
            // Extract from the field name: _fieldname_value -> fieldname
            logicalName = baseKey.substring(1, baseKey.length - 6).toLowerCase();
          }

          fieldKey = logicalName;
        }

        // Get attribute info if available
        const attributeInfo = attributeMap.get(baseKey) || attributeMap.get(fieldKey);

        // Create the field info object
        const fieldInfo: FieldTypeInfo = {
          value: item[baseKey],
          type: attributeInfo?.attributeType || (isLookup ? 'Lookup' : 'String'),
          displayName: attributeInfo?.displayName || undefined
        };

        // Add all annotations to the field info
        annotationKeys.forEach(annotationKey => {
          const annotationName = annotationKey.split('@')[1];
          if (annotationName) {
            // For formatted value, use a consistent property name
            if (annotationName === 'OData.Community.Display.V1.FormattedValue') {
              fieldInfo['FormattedValue'] = item[annotationKey];
            }
            // For lookup-specific annotations
            else if (annotationName === 'Microsoft.Dynamics.CRM.associatednavigationproperty') {
              fieldInfo['associatednavigationproperty'] = item[annotationKey];
            }
            else if (annotationName === 'Microsoft.Dynamics.CRM.lookuplogicalname') {
              fieldInfo['lookuplogicalname'] = item[annotationKey];
            }
            // Store other annotations as-is
            else {
              fieldInfo[annotationName] = item[annotationKey];
            }
          }
        });

        normalizedItem[fieldKey] = fieldInfo;
      });

      return normalizedItem;
    });
  }

  private normalizeData<T extends { [key: string]: any }>(data: T[]): T[] {
    if (!data?.length) return [];

    // Get all unique keys except @odata.etag
    const allKeys = new Set<keyof T>(
      data.flatMap(item =>
        Object.keys(item).filter(key => key !== '@odata.etag')
      ) as (keyof T)[]
    );

    return data.map(item => {
      const normalizedItem = {} as T;
      allKeys.forEach(key => {
        normalizedItem[key] = item[key] ?? null;
      });
      return normalizedItem;
    });
  }
}