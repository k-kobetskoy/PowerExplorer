import { Inject, Injectable } from '@angular/core';
import { Observable, of, switchMap, catchError, tap, BehaviorSubject, throwError, shareReplay, map } from 'rxjs';
import { BaseRequestService } from './entity-services/abstract/base-request.service';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { NodeTreeService } from './node-tree.service';
import { AttributeEntityService, EntityAttributeMap } from './entity-services/attribute-entity.service';
import { QueryNode } from '../models/query-node';
import { ErrorDialogService } from 'src/app/services/error-dialog.service';
import { AllAttributesStrategy, RowData } from './result-table/all-attributes-strategy';
import { DefinedAttributesStrategy } from './result-table/defined-attributes-strategy';
import { ACTIVE_ENVIRONMENT_BROWSER_URL } from 'src/app/models/tokens';

interface FetchXmlQueryOptions {
  maxPageSize?: number;
  includeAnnotations?: boolean;
  timeout?: number;
  includeFieldTypes?: boolean;
  includeLinkedEntities?: boolean;
}

export interface FieldTypeInfo {
  value: any;
  type: string;
  displayName?: string;
  FormattedValue?: string;
  associatednavigationproperty?: string;
  lookuplogicalname?: string;
  entityLogicalName?: string;
  [key: string]: any; // For any additional annotations
}

export interface TypedResultItem {
  [key: string]: any | FieldTypeInfo;
}

export interface HeaderMetadata {
  displayName: string;
  logicalName: string;
  type: string;
}

export interface MatTableRawData {
  header: { [key: string]: HeaderMetadata };
  rows: RowData[];
  __original_data?: any[];
}


export interface XmlExecutionResult {
  header: { [key: string]: HeaderMetadata };
  rawValues: any[];
  formattedValues: any[];
  linkValues?: any[]; // Add support for link values used by the result table
  __original_data?: any[]; // Original data from the API response for reference
}

// Define an interface for the Dataverse response
interface DataverseExecuteXmlResponse {
  statusCode?: number;
  headers?: any;
  body?: {
    value: any[];
    'odata.metadata'?: string;
    'odata.nextLink'?: string;
  };
  // Add direct properties to support both response formats
  value?: any[];
  '@odata.context'?: string;
  '@Microsoft.Dynamics.CRM.totalrecordcount'?: number;
  '@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded'?: boolean;
  '@Microsoft.Dynamics.CRM.globalmetadataversion'?: string;
}

@Injectable({ providedIn: 'root' })
export class XmlExecutorService extends BaseRequestService {
  private isExecuting: boolean = false; // Track execution state
  private lastError: string | null = null; // Store last error message

  // Add default result constant
  private readonly DEFAULT_RESULT: MatTableRawData = Object.freeze({
    header: {},
    rows: [],
    __original_data: []
  });

  // Add BehaviorSubject to track loading state
  private isLoadingState = new BehaviorSubject<boolean>(false);
  public isLoadingState$ = this.isLoadingState.asObservable();

  constructor(
    private attributeEntityService: AttributeEntityService,
    private nodeTreeService: NodeTreeService,
    private errorDialogService: ErrorDialogService,
    @Inject(ACTIVE_ENVIRONMENT_BROWSER_URL) private _activeEnvironmentBrowserUrl: BehaviorSubject<string>
  ) {
    super();
    console.log('XmlExecutorService constructor, _activeEnvironmentBrowserUrl:', this._activeEnvironmentBrowserUrl);
    if (this._activeEnvironmentBrowserUrl) {
      console.log('Initial environment URL value:', this._activeEnvironmentBrowserUrl.value);
      // Subscribe to changes in the environment URL
      this._activeEnvironmentBrowserUrl.subscribe(url => {
        console.log('Environment URL changed to:', url);
      });
    } else {
      console.error('_activeEnvironmentBrowserUrl is undefined in constructor');
    }
  }

  isLoading(): boolean {
    return this.isExecuting;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  clearError(): void {
    this.lastError = null;
  }

  executeXmlRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}): Observable<MatTableRawData> {
    this.isExecuting = true;
    this.isLoadingState.next(true);
    this.lastError = null;

    if (!xml || !entityNode) {
      this.isExecuting = false;
      this.isLoadingState.next(false);
      return throwError(() => new Error('XML and entity information are required. Please ensure you have a valid query with entity information before executing'));
    }

    if (!entityNode.entitySetName$ || !entityNode.entitySetName$.value) {
      this.isExecuting = false;
      this.isLoadingState.next(false);
      return throwError(() => new Error('Entity name is missing or invalid. Please select a valid entity for your query'));
    }

    const xmlOptions = this.extractQueryOptions();
    const mergedOptions = { ...xmlOptions, ...options };

    return this.executeRequest(xml, entityNode, mergedOptions).pipe(
      tap(() => {
        this.isExecuting = false;
        this.isLoadingState.next(false);
      }),
      catchError(error => {
        this.isExecuting = false;
        this.isLoadingState.next(false);
        this.lastError = error?.message || 'Unknown error';

        this.errorDialogService.showError({
          title: 'Query Execution Error',
          message: 'An error occurred while executing the query',
          details: error?.message || 'Unknown error'
        });

        return of<MatTableRawData>({ ...this.DEFAULT_RESULT });
      }),
      shareReplay(1)
    );
  }

  private extractQueryOptions(): FetchXmlQueryOptions {
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
    } catch (error) { throw error; }
  }

  private sanitizeForTransmission(xml: string): string {
    return xml
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private executeRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions): Observable<MatTableRawData> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          return throwError(() => new Error('No active environment URL found. Please connect to an environment before executing the query'));
        }

        const entitySetName = entityNode?.entitySetName$?.value;
        if (!entitySetName) {
          return throwError(() => new Error('Entity name is missing or invalid. Please select a valid entity for your query'));
        }

        const sanitizedXml = this.sanitizeForTransmission(xml);
        const encodedXml = encodeURIComponent(sanitizedXml);
        const url = API_ENDPOINTS.execute.getResourceUrl(envUrl, entitySetName, encodedXml);
        const headers = this.buildRequestOptions(options);

        return this.httpClient.get<DataverseExecuteXmlResponse>(url, headers).pipe(
          switchMap(response => {
            // Access the data directly from the response
            // The response object doesn't have a body property in this API
            const result = response?.value || [];
            
            if (!result?.length) {
              return of({ ...this.DEFAULT_RESULT });
            }
            
            // Get entity attribute map with null check
            const entityAttributeMap = this.nodeTreeService.getEntityAttributeMap();
            
            if (!entityAttributeMap) {
              return of({ ...this.DEFAULT_RESULT });
            }

            const primaryEntityName = this.nodeTreeService.getPrimaryEntityName();
            
            if (!primaryEntityName) {
              return of({ ...this.DEFAULT_RESULT });
            }

            try {
              return this.processDataWithStrategy(result, entityAttributeMap, primaryEntityName);
            } catch (err) {
              return of({ ...this.DEFAULT_RESULT });
            }
          }),
          catchError((error: HttpErrorResponse) => {
            // Add safety check for error message to prevent undefined access
            console.error('Error executing XML request:', error?.message || 'Unknown error');
            return throwError(() => error);
          })
        );
      })
    );
  }

  private buildRequestOptions(options: FetchXmlQueryOptions): { headers: HttpHeaders } {
    const preferOptions = [];

    // Add annotations option
    if (options.includeAnnotations) {
      preferOptions.push('odata.include-annotations="*"');
    } else {
      // Include annotations by default for backward compatibility
      preferOptions.push('odata.include-annotations="*"');
    }
    // Construct headers
    const headers = new HttpHeaders({
      'Prefer': preferOptions.join(',')
    });

    return { headers };
  }

  private processDataWithStrategy<T extends { [key: string]: any }>(
    data: T[],
    entityAttributeMap: EntityAttributeMap,
    primaryEntityName: string): Observable<MatTableRawData> {
    if (!data?.length || !entityAttributeMap) {
      return of({ header: {}, rows: [], __original_data: [] });
    }
    
    let hasDefinedAttributes = false;
    Object.values(entityAttributeMap).forEach(entityData => {
      if (entityData.attributeData && entityData.attributeData.length > 0) {
        hasDefinedAttributes = true;
      }
    });
    
    // Get the environment URL, with fallback to prevent null errors
    const environmentUrl = this._activeEnvironmentBrowserUrl?.value || '';

    try {
      if (!hasDefinedAttributes) {
        const strategy = new AllAttributesStrategy(this.attributeEntityService);
  
        return strategy.processRawData(
          data,
          entityAttributeMap,
          primaryEntityName,
          environmentUrl
        ).pipe(
          catchError(error => {
            return of({ header: {}, rows: [], __original_data: [] });
          })
        );
      }
      else {
        const strategy = new DefinedAttributesStrategy(this.attributeEntityService);
  
        return strategy.processRawData(
          data,
          entityAttributeMap,
          primaryEntityName,
          environmentUrl
        ).pipe(
          catchError(error => {
            return of({ header: {}, rows: [], __original_data: [] });
          })
        );
      }
    } catch (error) {
      return of({ header: {}, rows: [], __original_data: [] });
    }
  }
}