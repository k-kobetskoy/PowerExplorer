import { Injectable } from '@angular/core';
import { Observable, of, switchMap, catchError, tap, BehaviorSubject, take, throwError, shareReplay, map } from 'rxjs';
import { BaseRequestService } from './entity-services/abstract/base-request.service';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { XmlExecuteResultModel } from 'src/app/models/incoming/xml-execute-result/xml-execute-result-model';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { NodeTreeService } from './node-tree.service';
import { AttributeEntityService, EntityAttributeMap } from './entity-services/attribute-entity.service';
import { QueryNode } from '../models/query-node';
import { ErrorDialogService } from 'src/app/services/error-dialog.service';
import { EnvironmentEntityService } from './entity-services/environment-entity.service';
import { XmlCacheService } from './xml-cache.service';
import { AllAttributesStrategy } from './result-table/all-attributes-strategy';
import { DefinedAttributesStrategy } from './result-table/defined-attributes-strategy';

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

export interface XmlExecutionResult {
  header: { [key: string]: any };
  rawValues: any[];
  formattedValues: any[];
  linkValues?: any[]; // Add support for link values used by the result table
  __original_data?: any[]; // Original data from the API response for reference
}

@Injectable({ providedIn: 'root' })
export class XmlExecutorService extends BaseRequestService {
  private readonly DEFAULT_PAGE_SIZE = 100;
  private isExecuting: boolean = false; // Track execution state
  private lastError: string | null = null; // Store last error message

  // Add default result constant
  private readonly DEFAULT_RESULT: XmlExecutionResult = Object.freeze({
    header: {},
    rawValues: [],
    formattedValues: []
  });

  // Add BehaviorSubject to track loading state
  private isLoadingState = new BehaviorSubject<boolean>(false);
  public isLoadingState$ = this.isLoadingState.asObservable();

  constructor(
    private attributeEntityService: AttributeEntityService,
    private nodeTreeService: NodeTreeService,
    private errorDialogService: ErrorDialogService,
    private environmentEntityService: EnvironmentEntityService,
    private xmlCacheService: XmlCacheService
  ) {
    super();
  }

  clearFetchXmlCache(): void {
    this.xmlCacheService.clearFetchXmlCache();
  }


  getMostRecentCachedResult(): BehaviorSubject<XmlExecutionResult | null> {
    console.log('=== XMLExecutorService: getMostRecentCachedResult called ===');

    const cachedResult = this.xmlCacheService.getMostRecentFetchXmlResult<XmlExecutionResult>();

    if (!cachedResult) {
      console.log('XMLExecutorService: No cached result found from XmlCacheService (null response)');
    } else if (cachedResult.value === null) {
      console.log('XMLExecutorService: Cached result exists but has null value');
    } else {
      console.log('XMLExecutorService: Cached result exists with data:', {
        hasHeader: !!cachedResult.value.header,
        headerKeys: Object.keys(cachedResult.value.header || {}).length,
        rawValuesCount: cachedResult.value.rawValues?.length || 0,
        formattedValuesCount: cachedResult.value.formattedValues?.length || 0
      });
    }

    // If there's no cached result (null or undefined), initialize with empty structure
    if (!cachedResult || cachedResult.value === null) {
      console.log('XMLExecutorService: No cached result found, initializing with empty structure');
      const emptyResult = new BehaviorSubject<XmlExecutionResult | null>({
        header: {},
        rawValues: [],
        formattedValues: []
      });
      return emptyResult;
    }

    return cachedResult;
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

  executeAndCacheResult(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}): Observable<XmlExecutionResult> {
    this.isExecuting = true;
    this.isLoadingState.next(true);
    this.lastError = null;

    return this.executeXmlRequest(xml, entityNode, options).pipe(
      map(result => this.cleanupLookupFormattedValues(result)),
      tap(result => {
        this.activeEnvironmentUrl$.pipe(take(1)).subscribe(activeEnvironmentUrl => {
          this.xmlCacheService.cacheFetchXmlResult<XmlExecutionResult>(result, xml, entityNode, options, activeEnvironmentUrl);
        });

        this.isExecuting = false;
        this.isLoadingState.next(false);
      }),
      catchError(error => {
        this.isExecuting = false;
        this.isLoadingState.next(false);
        this.lastError = error?.message || 'Unknown error';

        // Consolidated error handling at the top level
        this.errorDialogService.showError({
          title: 'Query Execution Error',
          message: 'An error occurred while executing the query',
          details: error?.message || 'Unknown error'
        });

        // Return copy of default result
        return of<XmlExecutionResult>({ ...this.DEFAULT_RESULT });
      }),
      shareReplay(1)
    );
  }

  executeXmlRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}): Observable<XmlExecutionResult> {
    if (!xml || !entityNode) {
      return throwError(() => new Error('XML and entity information are required. Please ensure you have a valid query with entity information before executing'));
    }

    if (!entityNode.entitySetName$ || !entityNode.entitySetName$.value) {
      return throwError(() => new Error('Entity name is missing or invalid. Please select a valid entity for your query'));
    }

    const xmlOptions = this.extractQueryOptions();
    const mergedOptions = { ...xmlOptions, ...options };

    return this.executeRequest(xml, entityNode, mergedOptions).pipe(
      catchError(error => { return throwError(() => error); })
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

  private executeRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions): Observable<XmlExecutionResult> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) { return throwError(() => new Error('No active environment URL found. Please connect to an environment before executing the query')); }

        const entitySetName = entityNode?.entitySetName$?.value;
        if (!entitySetName) { return throwError(() => new Error('Entity name is missing or invalid. Please select a valid entity for your query')); }

        const cachedResults$ = this.xmlCacheService.getCachedFetchXmlResult<XmlExecutionResult>(xml, entityNode, options, envUrl);

        return cachedResults$.pipe(
          switchMap(cachedData => {
            if (cachedData) { return of<XmlExecutionResult>(cachedData); }

            const sanitizedXml = this.sanitizeForTransmission(xml);
            const encodedXml = encodeURIComponent(sanitizedXml);
            const url = API_ENDPOINTS.execute.getResourceUrl(envUrl, entitySetName, encodedXml);
            const headers = this.buildRequestOptions(options);

            return this.httpClient.get<XmlExecuteResultModel>(url, headers).pipe(
              tap(result => {
                console.log('XML result:', result);
              }),
              shareReplay(1),
              switchMap(result => {
                if (!result?.value?.length) {
                  return of<XmlExecutionResult>({ ...this.DEFAULT_RESULT });
                }

                try {
                  const entityAttributeMap = this.nodeTreeService.getEntityAttributeMap() as EntityAttributeMap;

                  // Use the new processDataWithStrategy method which handles strategy selection and processing
                  return this.processDataWithStrategy(result.value, entityAttributeMap).pipe(
                    tap(processedResult => {
                      // Cache the result
                      this.xmlCacheService.cacheFetchXmlResult<XmlExecutionResult>(
                        processedResult, xml, entityNode, options, envUrl
                      );
                    })
                  );
                } catch (error) {
                  console.error('Error processing data with strategy:', error);

                  // Return default result in case of error
                  return of<XmlExecutionResult>({ ...this.DEFAULT_RESULT });
                }
              }),
              catchError((error: HttpErrorResponse) => {
                console.error('Error executing XML request:', error.message);
                return throwError(() => error);
              })
            );
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

  // Helper method to find entity ID in a record
  private findEntityId(item: any, primaryEntity: { name: string, idField: string }): string | null {
    // Look for the entity ID in the response
    let entityIdValue = item[primaryEntity.idField];

    // If standard ID field not found, try to find ID using alternate patterns
    if (!entityIdValue) {
      // Pattern 1: Look for fields ending with "id"
      const potentialIdFields = Object.keys(item).filter(key =>
        key.toLowerCase().endsWith('id') &&
        this.inferType(key, item[key]) === 'Uniqueidentifier'
      );

      if (potentialIdFields.length > 0) {
        const firstIdField = potentialIdFields[0];
        entityIdValue = item[firstIdField];
      }
    }

    return entityIdValue || null;
  }

  // Helper method to build a Dynamics URL for an entity record
  private buildDynamicsUrl(entityName: string, entityId: string): string {
    let environmentUrl = '';

    try {
      let currentUrl = '';
      const subscription = this.activeEnvironmentUrl$.subscribe(url => {
        currentUrl = url || '';
      });
      subscription.unsubscribe();

      if (currentUrl) {
        // Convert API URL to web client URL if needed
        // Example: https://org2d6763a7.api.crm4.dynamics.com/ => https://org2d6763a7.crm4.dynamics.com/
        environmentUrl = currentUrl.replace('.api.', '.');

        // Clean up URL format
        if (environmentUrl.endsWith('/api/data/v9.2/')) {
          environmentUrl = environmentUrl.replace('/api/data/v9.2/', '/');
        } else if (environmentUrl.endsWith('/api/data/v9.1/')) {
          environmentUrl = environmentUrl.replace('/api/data/v9.1/', '/');
        } else if (environmentUrl.endsWith('/api/data/v9.0/')) {
          environmentUrl = environmentUrl.replace('/api/data/v9.0/', '/');
        }

        // Ensure URL ends with slash
        if (!environmentUrl.endsWith('/')) {
          environmentUrl += '/';
        }
      }
    } catch (error) {
      console.error('Error getting environment URL:', error);
    }

    // If we couldn't get the URL, log a warning
    if (!environmentUrl) {
      console.warn('Could not get environment URL for link building');
      return '';
    }

    // Ensure entityId is valid
    if (!entityId || entityId.startsWith('record-')) {
      console.warn('No valid entity ID for link building');
      return '';
    }

    // Format to match expected structure with forceUCI=1 parameter
    return `${environmentUrl}main.aspx?forceUCI=1&pagetype=entityrecord&etn=${entityName}&id=${entityId}`;
  }

  // Helper method to add entity URL to raw and formatted items
  private addEntityUrlToItems(
    rawItem: any,
    formattedItem: any,
    primaryEntity: { name: string, idField: string },
    entityIdValue: string
  ): void {
    // Create the URL only when we have a valid entity ID
    if (!entityIdValue || !primaryEntity.name) {
      console.log('Missing data for Dynamics URL, cannot create link');
      return;
    }

    // Create the URL
    const dynamicsUrl = this.buildDynamicsUrl(primaryEntity.name, entityIdValue);

    rawItem['__entity_url'] = {
      id: entityIdValue,
      url: dynamicsUrl,
      text: '🔗', // Use the same icon for both views
      entityName: primaryEntity.name,
      isRawView: true // Flag to identify this is from raw view
    };

    // For formatted view, provide a link object with icon
    formattedItem['__entity_url'] = {
      id: entityIdValue,
      url: dynamicsUrl,
      text: '🔗', // Icon for formatted view
      entityName: primaryEntity.name
    };
  }

  // Process data using the appropriate strategy based on query structure
  private processDataWithStrategy<T extends { [key: string]: any }>(data: T[], entityAttributeMap: EntityAttributeMap): Observable<XmlExecutionResult> {
    if (!data?.length || !entityAttributeMap) {
      return of({ header: {}, rawValues: [], formattedValues: [], __original_data: [] });
    }
    
    // Find the primary entity (needed for entity URL functionality)
    let primaryEntity: { name: string, idField: string } | null = null;
    Object.entries(entityAttributeMap).forEach(([entityName, entityData]) => {
      if ((entityData as any).isPrimaryEntity) {
        primaryEntity = {
          name: entityName,
          idField: (entityData as any).primaryIdAttribute || `${entityName}id`
        };
        console.log(`processDataWithStrategy: Found primary entity: ${primaryEntity.name} with ID field: ${primaryEntity.idField}`);
      }
    });
    
    // Determine which strategy to use based on attribute presence
    // Check if there are any attributes defined in the request
    let hasDefinedAttributes = false;
    Object.values(entityAttributeMap).forEach(entityData => {
      if (entityData.attributeData && entityData.attributeData.length > 0) {
        hasDefinedAttributes = true;
      }
    });
    
    // Prepare raw data for processing by strategy
    const rawData: XmlExecutionResult = {
      header: {},
      rawValues: [...data],
      formattedValues: [...data],
      __original_data: [...data]
    };
    
    // For requests without defined attributes 
    if (!hasDefinedAttributes) {
      console.log('processDataWithStrategy: No attributes defined, using AllAttributesStrategy');
      
      // Directly create and use the AllAttributesStrategy with integrated processing
      const strategy = new AllAttributesStrategy(this.attributeEntityService);
      
      // Process the data with the strategy, passing primary entity info for URL generation
      return strategy.processRawData(
        rawData, 
        entityAttributeMap, 
        primaryEntity, 
        this.findEntityId.bind(this), 
        this.addEntityUrlToItems.bind(this)
      );
    } 
    // For requests with defined attributes
    else {
      console.log('processDataWithStrategy: Attributes defined, using DefinedAttributesStrategy');
      
      // Directly create and use the DefinedAttributesStrategy
      const strategy = new DefinedAttributesStrategy(this.attributeEntityService);
      
      // Process the data with the strategy, passing primary entity info for URL generation
      return strategy.processRawData(
        rawData, 
        entityAttributeMap, 
        primaryEntity, 
        this.findEntityId.bind(this), 
        this.addEntityUrlToItems.bind(this)
      );
    }
  }

  // Helper method to infer the type of a field
  private inferType(key: string, value: any): string {
    // Handle lookup fields by name pattern
    if (key.startsWith('_') && key.endsWith('_value')) {
      return 'Lookup';
    }

    // Check by value type
    if (value === true || value === false) {
      return 'Boolean';
    } else if (typeof value === 'number') {
      if (key.toLowerCase().includes('money') ||
        key.toLowerCase().includes('price') ||
        key.toLowerCase().includes('cost') ||
        key.toLowerCase().includes('amount')) {
        return 'Money';
      }
      return 'Integer';
    } else if (value instanceof Date) {
      return 'DateTime';
    } else if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Check if it's a value field that could be a lookup reference
      if (key.endsWith('_value') || key.endsWith('id')) {
        return 'Lookup';
      }
      return 'Uniqueidentifier';
    }

    return 'String';
  }

  // Add new helper method to clean up lookup formatted values  
  private cleanupLookupFormattedValues(result: XmlExecutionResult): XmlExecutionResult {
    if (!result || !result.formattedValues || result.formattedValues.length === 0) {
      return result;
    }

    // Make a copy to avoid modifying the original
    const cleanedResult: XmlExecutionResult = {
      ...result,
      formattedValues: [...result.formattedValues]
    };

    // Process each formatted value in each row
    cleanedResult.formattedValues.forEach((row, rowIndex) => {
      Object.keys(row).forEach(key => {
        const value = row[key];
        
        // Check for ID: pattern in string values
        if (typeof value === 'string' && value.startsWith('ID:') && value.includes('-')) {
          // This is likely a lookup field ID that wasn't properly formatted
          // Try to find a better formatted value from the raw data
          if (result.rawValues && rowIndex < result.rawValues.length) {
            const rawValue = result.rawValues[rowIndex][key];
            
            // If we have a proper formatted value different from the raw value, use it
            if (rawValue !== value && typeof rawValue === 'string' && 
                !rawValue.startsWith('ID:') && !rawValue.includes('-')) {
              row[key] = rawValue;
              return;
            }
            
            // If raw value is a GUID, use it instead of the ID: prefix
            if (typeof rawValue === 'string' && 
                rawValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              row[key] = rawValue;
              return;
            }
          }
          
          // Otherwise extract the GUID from the ID: prefix
          const guidMatch = value.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (guidMatch && guidMatch[1]) {
            row[key] = guidMatch[1];
          } else {
            // If we can't extract a GUID, clear the value
            row[key] = '';
          }
        }
      });
    });

    return cleanedResult;
  }
}