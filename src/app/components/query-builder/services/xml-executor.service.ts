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
  ) {
    super();
    this.getActiveEnvironmentUrl();
  }

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
      tap(result=>console.log(result)),
      switchMap(result => {
        if (!result?.value?.length) {
          return of([]);
        }
        
        const entityName = entityNode.attributes$.value.filter(attr=>attr.editorName==='name')[0].value$.value;

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

    const allKeys = new Set<keyof T>(
      data.flatMap(item =>
        Object.keys(item).filter(key => key !== '@odata.etag')
      ) as (keyof T)[]
    );

    const matchingKeys = Array.from(allKeys).filter(key => attributeMap.has(String(key)));

    if (matchingKeys.length === 0) {
      console.log('No matching keys found between data and attribute map. Will treat all fields as strings.');
      return this.normalizeData(data);
    }

    return data.map(item => {
      const normalizedItem: TypedResultItem = {};

      allKeys.forEach(key => {
        const keyStr = String(key); // Convert symbol to string
        const fieldValue = item[key] ?? null;
        const attributeInfo = attributeMap.get(keyStr);

        if (attributeInfo) {
          // Include type information with the value
          normalizedItem[keyStr] = {
            value: fieldValue,
            type: attributeInfo.attributeType
          } as FieldTypeInfo;
        } else {

          normalizedItem[keyStr] = fieldValue;
        }
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