import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, catchError } from 'rxjs';
import { BaseRequestService } from './entity-services/abstract/base-request.service';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { XmlExecuteResultModel } from 'src/app/models/incoming/xml-execute-result/xml-execute-result-model';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { NodeTreeService } from './node-tree.service';

interface FetchXmlQueryOptions {
  maxPageSize?: number;
  includeAnnotations?: boolean;
  timeout?: number;
}

@Injectable({ providedIn: 'root' })
export class XmlExecutorService extends BaseRequestService {
  private readonly DEFAULT_PAGE_SIZE = 100;

  constructor(private nodeTreeService: NodeTreeService) {
    super();
    this.getActiveEnvironmentUrl();
  }

  executeXmlRequest(xml: string, entity: string, options: FetchXmlQueryOptions = {}): Observable<Object[]> {
    if (!xml || !entity) {
      console.error('XML and entity name are required');
      return of([]);
    }

    const xmlOptions = this.extractQueryOptions(xml);
    const mergedOptions = { ...xmlOptions, ...options };

    return this.executeRequest(xml, entity, mergedOptions);
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

  private executeRequest(xml: string, entity: string, options: FetchXmlQueryOptions): Observable<Object[]> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          console.error('No active environment URL found');
          return of(null);
        }

        const sanitizedXml = this.sanitizeForTransmission(xml);
        const encodedXml = encodeURIComponent(sanitizedXml);
        const url = API_ENDPOINTS.execute.getResourceUrl(envUrl, entity, encodedXml);
        const requestOptions = this.buildRequestOptions(options);

        console.log('=== Executing XML request:', url);
        console.log('=== With options:', options);

        return this.httpClient.get<XmlExecuteResultModel>(url, requestOptions).pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Error executing XML request:', error.message);
            return of(null);
          })
        );
      }),
      map(result => this.normalizeData(result?.value || []))
    );
  }

  private buildRequestOptions(options: FetchXmlQueryOptions): { headers: HttpHeaders } {
    const headers = new HttpHeaders({
      'Prefer': [
        `odata.maxpagesize=${options.maxPageSize || this.DEFAULT_PAGE_SIZE}`,
        options.includeAnnotations ? 'odata.include-annotations=*' : ''
      ].filter(Boolean).join(',')
    });

    return { headers };
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