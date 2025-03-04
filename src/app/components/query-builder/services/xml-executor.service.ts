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

  //TODO: Check if wee need at least one of these validations
  private validateXml(xml: string): boolean {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent);
        return false;
      }

      // Validate fetch element
      const fetchElement = xmlDoc.getElementsByTagName('fetch')[0];
      if (!fetchElement) {
        console.error('Missing fetch element in XML');
        return false;
      }

      // Validate entity element
      const entityElement = xmlDoc.getElementsByTagName('entity')[0];
      if (!entityElement) {
        console.error('Missing entity element in XML');
        return false;
      }

      // Check for potentially dangerous elements
      const dangerousElements = xmlDoc.querySelectorAll('script, iframe, object, embed');
      if (dangerousElements.length > 0) {
        console.error('XML contains potentially dangerous elements');
        return false;
      }

      return true;
    } catch (error) {
      console.error('XML validation error:', error);
      return false;
    }
  }

  //TODO: Check if this is needed. Probably we can save this for later
  private sanitizeFetchXml(xml: string): string {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');

      // Helper function to sanitize text content and attributes
      const sanitizeValue = (value: string) => {
        if (!value) return value;
        return value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')
          .replace(/\x00/g, '') // Remove null bytes
          .replace(/<!--.*?-->/g, ''); // Remove comments
      };

      // Recursively sanitize all text nodes and attributes
      const sanitizeNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = sanitizeValue(node.textContent || '');
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          Array.from(element.attributes).forEach(attr => {
            element.setAttribute(attr.name, sanitizeValue(attr.value));
          });
          Array.from(node.childNodes).forEach(sanitizeNode);
        }
      };

      sanitizeNode(xmlDoc.documentElement);

      // Serialize back to string
      const serializer = new XMLSerializer();
      return serializer.serializeToString(xmlDoc);
    } catch (error) {
      console.error('Error sanitizing FetchXML:', error);
      return '';
    }
  }

  executeXmlRequest(
    xml: string, 
    entity: string, 
    options: FetchXmlQueryOptions = {}
  ): Observable<Object[]> {
    if (!xml || !entity) {
      console.error('XML and entity name are required');
      return of([]);
    }

    // Extract pagination and annotation options from the XML
    const xmlOptions = this.extractQueryOptions(xml);
    const mergedOptions = { ...xmlOptions, ...options };

    return this.executeRequest(xml, entity, mergedOptions);
  }

  private extractQueryOptions(xml: string): FetchXmlQueryOptions {
    try {
      const options: FetchXmlQueryOptions = {};
      
      // Get the fetch node from the tree
      const fetchNode = this.nodeTreeService.getNodeTree().value.root;
      if (!fetchNode) {
        return options;
      }

      // Extract page size from fetch top attribute
      const topAttribute = fetchNode.attributes$.value.find(attr => attr.editorName === 'top');
      if (topAttribute?.value$.value) {
        options.maxPageSize = parseInt(topAttribute.value$.value, 10);
      }
      
      // Check if annotations are needed by looking through all attributes
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

  /**
   * Sanitizes XML for HTTP transmission by removing comments and escaping special characters
   */
  private sanitizeForTransmission(xml: string): string {
    return xml
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Executes the actual HTTP request to the Dataverse API
   */
  private executeRequest(
    xml: string,
    entity: string,
    options: FetchXmlQueryOptions
  ): Observable<Object[]> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          console.error('No active environment URL found');
          return of(null);
        }

        // Sanitize and encode XML for transmission
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

    // Create normalized items with consistent keys
    return data.map(item => {
      const normalizedItem = {} as T;
      allKeys.forEach(key => {
        normalizedItem[key] = item[key] ?? null;
      });
      return normalizedItem;
    });
  }
}