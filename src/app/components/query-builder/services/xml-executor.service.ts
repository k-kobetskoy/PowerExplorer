import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, catchError, tap, BehaviorSubject, take, throwError, shareReplay } from 'rxjs';
import { BaseRequestService } from './entity-services/abstract/base-request.service';
import { API_ENDPOINTS } from 'src/app/config/api-endpoints';
import { XmlExecuteResultModel } from 'src/app/models/incoming/xml-execute-result/xml-execute-result-model';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { NodeTreeService } from './node-tree.service';
import { AttributeEntityService, EntityAttributeMap, AttributeMapResult } from './entity-services/attribute-entity.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { QueryNode } from '../models/query-node';
import { ErrorDialogService } from 'src/app/services/error-dialog.service';
import { EnvironmentEntityService } from './entity-services/environment-entity.service';
import { XmlCacheService } from './xml-cache.service';
import { ResultProcessingFactoryService } from './result-table/result-processing-factory.service';
import { AllAttributesStrategy } from './result-table/all-attributes-strategy';
import { determineProcessingStrategy, ProcessingStrategyType } from './result-table/result-processing-strategy';
import { normalizeResultAttributes } from './result-table/normalizeDataBasicWithoutAttributes';

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
  entityLogicalName?: string;
  [key: string]: any; // For any additional annotations
}

export interface TypedResultItem {
  [key: string]: any | FieldTypeInfo;
}

export interface XmlExecutionResult {
  header: { [key: string]: any };
  rawValues: any[];
  formatedValues: any[];
  linkValues?: any[]; // Add support for link values used by the result table
  __original_data?: any[]; // Original data from the API response for reference
}

@Injectable({ providedIn: 'root' })
export class XmlExecutorService extends BaseRequestService {
  private readonly DEFAULT_PAGE_SIZE = 100;
  private isExecuting: boolean = false; // Track execution state
  private lastError: string | null = null; // Store last error message
  
  // Add BehaviorSubject to track loading state
  private isLoadingState = new BehaviorSubject<boolean>(false);
  public isLoadingState$ = this.isLoadingState.asObservable();
  
  constructor(
    private attributeEntityService: AttributeEntityService,
    private nodeTreeService: NodeTreeService,
    private errorDialogService: ErrorDialogService,
    private environmentEntityService: EnvironmentEntityService,
    private xmlCacheService: XmlCacheService,
    private resultProcessingFactory: ResultProcessingFactoryService
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
        formattedValuesCount: cachedResult.value.formatedValues?.length || 0
      });
    }
    
    // If there's no cached result (null or undefined), initialize with empty structure
    if (!cachedResult || cachedResult.value === null) {
      console.log('XMLExecutorService: No cached result found, initializing with empty structure');
      const emptyResult = new BehaviorSubject<XmlExecutionResult | null>({
        header: {},
        rawValues: [],
        formatedValues: []
      });
      return emptyResult;
    }
    
    return cachedResult;
  }

  /**
   * Returns the current loading state
   */
  isLoading(): boolean {
    return this.isExecuting;
  }

  /**
   * Returns the last error that occurred during execution
   */
  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Clears the error state
   */
  clearError(): void {
    this.lastError = null;
  }

  /**
   * Executes the XML query and updates the cache with the result
   * @param xml The XML query to execute
   * @param entityNode The entity node with query metadata
   * @param options Optional query parameters
   * @returns Observable of the execution result
   */
  executeAndCacheResult(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}): Observable<XmlExecutionResult> {
    this.isExecuting = true;
    this.isLoadingState.next(true);
    this.lastError = null;
    
    return this.executeXmlRequest(xml, entityNode, options).pipe(
      tap(result => {
        // Cache the result with the current environment URL
        this.activeEnvironmentUrl$.pipe(take(1)).subscribe(activeEnvironmentUrl => {
          this.xmlCacheService.cacheFetchXmlResult<XmlExecutionResult>(
            result, 
            xml, 
            entityNode, 
            options, 
            activeEnvironmentUrl
          );
          
          // Remove the explicit notification that causes duplicate execution
          // The shareReplay operator will handle sharing the result with all subscribers
        });
        
        this.isExecuting = false;
        this.isLoadingState.next(false);
      }),
      catchError(error => {
        this.isExecuting = false;
        this.isLoadingState.next(false);
        this.lastError = error;
        return throwError(() => error);
      }),
      shareReplay(1) // Add shareReplay to share the result with all subscribers
    );
  }

  executeXmlRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}): Observable<XmlExecutionResult> {
    // Set loading state
    this.isExecuting = true;
    this.isLoadingState.next(true);
    
    if (!xml || !entityNode) {
      console.error('XML and entity node are required');
      this.errorDialogService.showError({
        title: 'Invalid Query',
        message: 'XML and entity information are required',
        details: 'Please ensure you have a valid query with entity information before executing'
      });
      
      this.isExecuting = false;
      this.isLoadingState.next(false);
      return of<XmlExecutionResult>({ header: {}, rawValues: [], formatedValues: [] });
    }

    // Validate that the entity node has a valid entity name
    if (!entityNode.entitySetName$ || !entityNode.entitySetName$.value) {
      console.error('Entity name is null or undefined');
      this.errorDialogService.showError({
        title: 'Invalid Entity',
        message: 'Entity name is missing or invalid',
        details: 'Please select a valid entity for your query'
      });
      
      this.isExecuting = false;
      this.isLoadingState.next(false);
      return of<XmlExecutionResult>({ header: {}, rawValues: [], formatedValues: [] });
    }

    const xmlOptions = this.extractQueryOptions(xml);
    const mergedOptions = { ...xmlOptions, ...options };
    console.log('XmlExecutorService: Options for query execution:', mergedOptions);

    return this.executeRequest(xml, entityNode, mergedOptions).pipe(
      // Just pass through the result
      map(result => {
        console.log('XmlExecutorService: Final result being sent to component:', 
          result ? { 
            headerKeys: Object.keys(result.header || {}).length,
            rawValuesCount: result.rawValues?.length || 0,
            formattedValuesCount: result.formatedValues?.length || 0
          } : 'no result');
        
        // Update loading state
        this.isExecuting = false;
        this.isLoadingState.next(false);
        
        return result;
      }),
      // Catch any errors at the top level
      catchError(error => {
        console.error('Top level error in executeXmlRequest:', error);
        
        // Update loading state
        this.isExecuting = false;
        this.isLoadingState.next(false);
        
        return of<XmlExecutionResult>({ header: {}, rawValues: [], formatedValues: [] });
      })
    );
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

  private executeRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions): Observable<XmlExecutionResult> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          console.error('No active environment URL found');
          this.errorDialogService.showError({
            title: 'Connection Error',
            message: 'No active environment URL found',
            details: 'Please connect to an environment before executing the query'
          });
          
          this.isExecuting = false;
          this.isLoadingState.next(false);
          return of<XmlExecutionResult>({ header: {}, rawValues: [], formatedValues: [] });
        }

        // Additional validation for entitySetName
        const entitySetName = entityNode?.entitySetName$?.value;
        if (!entitySetName) {
          console.error('Entity set name is null or undefined');
          this.errorDialogService.showError({
            title: 'Invalid Query',
            message: 'Entity name is missing or invalid',
            details: 'Please select a valid entity for your query'
          });
          
          this.isExecuting = false;
          this.isLoadingState.next(false);
          return of<XmlExecutionResult>({ header: {}, rawValues: [], formatedValues: [] });
        }

        // Check if we have cached results using the XmlCacheService
        const cachedResults$ = this.xmlCacheService.getCachedFetchXmlResult<XmlExecutionResult>(xml, entityNode, options, envUrl);
        
        // If we have cached results, return them
        return cachedResults$.pipe(
          switchMap(cachedData => {
            if (cachedData) {
              return of<XmlExecutionResult>(cachedData);
            }
            
            // No cached results, execute the query
            const sanitizedXml = this.sanitizeForTransmission(xml);
            const encodedXml = encodeURIComponent(sanitizedXml);
            const url = API_ENDPOINTS.execute.getResourceUrl(envUrl, entitySetName, encodedXml);
            
            // Add loading-key header for result table loading indicator
            const headers = new HttpHeaders({
              'Prefer': 'odata.include-annotations="*"',
            });
            
            const requestOptions = { headers };

            return this.httpClient.get<XmlExecuteResultModel>(url, requestOptions).pipe(
              tap(result => {
                console.log('XML result:', result);
              }),
              // Apply shareReplay here to share the HTTP response with downstream operators
              shareReplay(1),
              switchMap(result => {
                if (!result?.value?.length) {
                  return of<XmlExecutionResult>({ header: {}, rawValues: [], formatedValues: [] });
                }
                
                // Process entities and attributes using the strategy pattern with the new method
                try {
                  const entityAttributeMap = this.nodeTreeService.getEntityAttributeMap() as EntityAttributeMap;
                  
                  // Create a basic normalized result that we'll pass to the strategy
                  const basicResult = this.normalizeData(result.value, entityAttributeMap);
                  
                  // Determine which strategy to use
                  const strategyType = determineProcessingStrategy(entityAttributeMap);
                  console.log(`[XmlExecutorService] Using strategy: ${ProcessingStrategyType[strategyType]}`);
                  
                  // Get the strategy from the factory
                  const strategy = this.resultProcessingFactory.getStrategy(entityAttributeMap);
                  
                  // Use the new processResultsWithData method which loads attributes and processes in one step
                  return strategy.processResultsWithData(basicResult, entityAttributeMap).pipe(
                    tap(processedResult => {
                      // Cache the result
                      this.xmlCacheService.cacheFetchXmlResult<XmlExecutionResult>(
                        processedResult, xml, entityNode, options, envUrl
                      );
                    })
                  );
                } catch (error) {
                  console.error('Error processing data with strategy:', error);
                  
                  // Fallback to basic normalization if strategy fails
                  const entityAttributeMap = this.nodeTreeService.getEntityAttributeMap() as EntityAttributeMap;
                  const basicData = this.normalizeData(result.value, entityAttributeMap);
                  
                  // Cache the basic results
                  this.xmlCacheService.cacheFetchXmlResult<XmlExecutionResult>(
                    basicData, xml, entityNode, options, envUrl
                  );
                  
                  return of<XmlExecutionResult>(basicData);
                }
              }),
              catchError((error: HttpErrorResponse) => {
                console.error('Error executing XML request:', error.message);
                this.errorDialogService.showHttpError(error);
                
                this.isExecuting = false;
                this.isLoadingState.next(false);
                
                return of<XmlExecutionResult>({ header: {}, rawValues: [], formatedValues: [] });
              })
            );
          })
        );
      })
    );
  }

  private buildRequestOptions(options: FetchXmlQueryOptions): { headers: HttpHeaders } {
    const headers = new HttpHeaders({
      'Prefer': [
        //`odata.maxpagesize=${options.maxPageSize || this.DEFAULT_PAGE_SIZE}`,
        'odata.include-annotations="*"'
      ].filter(Boolean).join(',')
    });

    return { headers };
  }

  // Helper method to add entity URL to the header
  private addEntityUrlToHeader(header: { [key: string]: any }): void {
    const urlFieldName = '__entity_url';
    header[urlFieldName] = {
      displayName: 'View in Dynamics',
      logicalName: urlFieldName,
      type: 'DynamicsLink',
      isEntityUrl: true
    };
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
    // Use the correct format: https://org2d6763a7.crm4.dynamics.com/main.aspx?forceUCI=1&pagetype=entityrecord&etn=cr1fc_order&id=61ee46ac-a111-ed11-b83d-000d3ab99dad
    let environmentUrl = '';
    
    try {
      // Get the active environment URL using a synchronous approach
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
    console.log(`Created Dynamics URL for ${primaryEntity.name}:`, dynamicsUrl);
    
    // For raw view, use the same icon as formatted view for consistency
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

  // Update the normalizeDataWithTypes method to add more targeted logging
  private normalizeDataWithTypes(
    data: any[], 
    attributeMaps: AttributeMapResult, 
    entityAttributeMap: EntityAttributeMap
  ): XmlExecutionResult {
    console.log('[XmlExecutorService:normalizeDataWithTypes] Starting with data length:', data?.length);
    console.log('[XmlExecutorService:normalizeDataWithTypes] attributeMaps:', 
      attributeMaps ? `Found ${Object.keys(attributeMaps).length} entities with ${this.countTotalAttributes(attributeMaps)} total attributes` : 'No attributeMaps');
    console.log('[XmlExecutorService:normalizeDataWithTypes] entityAttributeMap:', JSON.stringify(entityAttributeMap));
    
    // First create a basic normalized result
    console.log('[XmlExecutorService:normalizeDataWithTypes] Creating basic normalized result with normalizeData');
    const basicResult = this.normalizeData(data, entityAttributeMap);
    
    console.log('[XmlExecutorService:normalizeDataWithTypes] Basic result created:', {
      headerKeysCount: Object.keys(basicResult.header || {}).length,
      rawValuesCount: basicResult.rawValues?.length,
      formattedValuesCount: basicResult.formatedValues?.length
    });
    
    // Specific debug for cr1fc_orderid
    if (basicResult && basicResult.rawValues && basicResult.rawValues.length > 0) {
      console.log('[XmlExecutorService:normalizeDataWithTypes] cr1fc_orderid in header:', 
        Object.keys(basicResult.header).includes('cr1fc_orderid'));
      console.log('[XmlExecutorService:normalizeDataWithTypes] cr1fc_orderid in raw values:', 
        Object.keys(basicResult.rawValues[0]).includes('cr1fc_orderid'));
      console.log('[XmlExecutorService:normalizeDataWithTypes] cr1fc_orderid in formatted values:', 
        basicResult.formatedValues && basicResult.formatedValues.length > 0 ? 
        Object.keys(basicResult.formatedValues[0]).includes('cr1fc_orderid') : 'No formatted values');
        
      // Important: If cr1fc_orderid is in data but not in header, add it to header
      if (Object.keys(basicResult.rawValues[0]).includes('cr1fc_orderid') && 
          !Object.keys(basicResult.header).includes('cr1fc_orderid')) {
        console.log('[XmlExecutorService:normalizeDataWithTypes] Adding missing cr1fc_orderid to header');
        basicResult.header['cr1fc_orderid'] = {
          displayName: 'Order ID',
          logicalName: 'cr1fc_orderid',
          type: 'Uniqueidentifier'
        };
      }
    }
    
    if (basicResult && basicResult.rawValues && basicResult.rawValues.length > 0) {
      console.log('[XmlExecutorService:normalizeDataWithTypes] First row raw values keys:', 
        Object.keys(basicResult.rawValues[0]));
      
      if (basicResult.formatedValues && basicResult.formatedValues.length > 0) {
        console.log('[XmlExecutorService:normalizeDataWithTypes] First row formatted values keys:', 
          Object.keys(basicResult.formatedValues[0]));
      }
    }
    
    // No data to process, return the basic result
    if (!data || data.length === 0) {
      console.log('[XmlExecutorService:normalizeDataWithTypes] No data to process, returning basic result');
      return basicResult;
    }
    
    try {
      console.log('[XmlExecutorService:normalizeDataWithTypes] Processing result with strategy pattern');
      
      // Check if attributeMaps are empty or missing attributes
      const hasEmptyAttributeMaps = !attributeMaps || 
        Object.keys(attributeMaps).length === 0 ||
        this.countTotalAttributes(attributeMaps) === 0;
      
      const strategyType = determineProcessingStrategy(entityAttributeMap);
      console.log(`[XmlExecutorService:normalizeDataWithTypes] Strategy type determined: ${ProcessingStrategyType[strategyType]}`);
      
      // If using ALL_ATTRIBUTES strategy but attributeMaps is empty, we need to load all attributes
      if (strategyType === ProcessingStrategyType.ALL_ATTRIBUTES && hasEmptyAttributeMaps) {
        console.log('[XmlExecutorService:normalizeDataWithTypes] ALL_ATTRIBUTES strategy with empty attributeMaps - need to load all attributes');
        
        // In this case, we'll need to fetch all attributes for the entities
        const entityLogicalNames = Object.keys(entityAttributeMap);
        console.log('[XmlExecutorService:normalizeDataWithTypes] Will load all attributes for these entities:', entityLogicalNames);
        
        // Uncomment and use this approach if you want to fetch attributes on demand here
        // But for now, we'll rely on the AttributeEntityService to detect the empty attribute arrays 
        // and fetch all attributes automatically
      }
      
      // Get the appropriate strategy based on the entity attribute map
      console.log('[XmlExecutorService:normalizeDataWithTypes] Getting strategy from factory');
      const strategy = this.resultProcessingFactory.getStrategy(entityAttributeMap);
      
      // Process the result using the strategy
      console.log('[XmlExecutorService:normalizeDataWithTypes] Processing result with strategy:', 
        strategy instanceof AllAttributesStrategy ? 'AllAttributesStrategy' : 'DefinedAttributesStrategy');
      let processedResult = strategy.processResults(basicResult, entityAttributeMap, attributeMaps);
      
      console.log('[XmlExecutorService:normalizeDataWithTypes] Processing complete. Result:', {
        headerKeysCount: Object.keys(processedResult.header || {}).length,
        rawValuesCount: processedResult.rawValues?.length,
        formattedValuesCount: processedResult.formatedValues?.length
      });
      
      // Log a detailed comparison of before/after
      if (processedResult && processedResult.rawValues && processedResult.rawValues.length > 0) {
        const basicKeys = basicResult.rawValues[0] ? Object.keys(basicResult.rawValues[0]) : [];
        const processedKeys = Object.keys(processedResult.rawValues[0]);
        const newKeys = processedKeys.filter(key => !basicKeys.includes(key));
        
        console.log('[XmlExecutorService:normalizeDataWithTypes] New keys added by strategy:', newKeys);
        
        // Important: Check if header and raw values have the same keys
        const headerKeys = Object.keys(processedResult.header).sort();
        const dataKeys = Object.keys(processedResult.rawValues[0]).sort();
        
        // Identify keys in header but not in data
        const missingInData = headerKeys.filter(key => !dataKeys.includes(key));
        if (missingInData.length > 0) {
          console.log('[XmlExecutorService:normalizeDataWithTypes] Keys in header but not in data:', missingInData);
        }
        
        // Identify keys in data but not in header
        const missingInHeader = dataKeys.filter(key => !headerKeys.includes(key));
        if (missingInHeader.length > 0) {
          console.log('[XmlExecutorService:normalizeDataWithTypes] Keys in data but not in header:', missingInHeader);
          
          // Fix: Add missing keys to header
          for (const key of missingInHeader) {
            if (key !== '__entity_url' && key !== '__raw_data') { // Skip special keys
              console.log(`[XmlExecutorService:normalizeDataWithTypes] Adding missing key to header: ${key}`);
              processedResult.header[key] = {
                displayName: this.getDisplayName(key),
                logicalName: key,
                type: this.inferType(key, processedResult.rawValues[0][key])
              };
            }
          }
        }
        
        console.log('[XmlExecutorService:normalizeDataWithTypes] Header keys vs Raw data keys match:',
          Object.keys(processedResult.header).sort().join(',') === Object.keys(processedResult.rawValues[0]).sort().join(','));
        console.log('[XmlExecutorService:normalizeDataWithTypes] Raw vs Formatted keys match:',
          processedResult.formatedValues && processedResult.formatedValues.length > 0 ? 
            Object.keys(processedResult.rawValues[0]).sort().join(',') === 
            Object.keys(processedResult.formatedValues[0]).sort().join(',') : 'No formatted values');
      }
      
      // Final normalization to ensure all rows have all attributes
      console.log('[XmlExecutorService:normalizeDataWithTypes] Applying final normalization to handle inconsistent rows');
      
      // Convert attributeMaps to the format expected by normalizeResultAttributes
      const metadataAttributesMap: { [logicalName: string]: any } = {};
      if (attributeMaps) {
        Object.keys(attributeMaps).forEach(entityName => {
          const attributeMap = attributeMaps[entityName];
          if (attributeMap) {
            // Add all attributes from this entity to the map
            attributeMap.forEach((attrModel, attrName) => {
              metadataAttributesMap[attrName] = attrModel;
            });
          }
        });
      }
      
      processedResult = normalizeResultAttributes(processedResult, metadataAttributesMap);
      
      return processedResult;
    } catch (error) {
      console.error('[XmlExecutorService:normalizeDataWithTypes] Error processing result with strategy:', error);
      return basicResult;
    }
  }
  
  // Helper method to count total attributes in attributeMaps
  private countTotalAttributes(attributeMaps?: AttributeMapResult): number {
    if (!attributeMaps) {
      return 0;
    }
    
    let totalCount = 0;
    Object.values(attributeMaps).forEach(map => {
      totalCount += map ? map.size : 0;
    });
    
    return totalCount;
  }

  // Helper method to get unique records
  private getUniqueRecords(records: any[]): any[] {
    // Don't deduplicate unless explicitly requested
    // Returning original records to prevent automatic DISTINCT-like behavior
    return records;
    
    /* Original deduplication code commented out
    try {
      const uniqueMap = new Map<string, any>();
      
      records.forEach(record => {
        try {
          const recordKey = JSON.stringify(record);
          if (!uniqueMap.has(recordKey)) {
            uniqueMap.set(recordKey, record);
          }
        } catch (e) {
          console.error('Error stringifying record:', e);
          // If we can't stringify, just add the record
          uniqueMap.set(Math.random().toString(), record);
        }
      });
      
      return Array.from(uniqueMap.values());
    } catch (e) {
      console.error('Error deduplicating records:', e);
      return records;
    }
    */
  }

  // Basic data normalization when attribute maps aren't available
  private normalizeData<T extends { [key: string]: any }>(data: T[], passedEntityAttributeMap: EntityAttributeMap): XmlExecutionResult {
    console.log('[XmlExecutorService:normalizeData] Starting normalizeData with data length:', data?.length);
    
    if (!data?.length) {
      console.log('normalizeData: No data to process');
      return { header: {}, rawValues: [], formatedValues: [], __original_data: [] };
    }
    
    // Use the passed entity attribute map
    const entityAttributeMap = passedEntityAttributeMap;
    if (!entityAttributeMap) {
      console.log('normalizeData: No entity attribute map found, cannot determine requested attributes');
      return { header: {}, rawValues: [], formatedValues: [], __original_data: [] };
    }
    
    // Check if there are any attributes defined in the request
    let hasDefinedAttributes = false;
    Object.values(entityAttributeMap).forEach(entityData => {
      if (entityData.attributeData && entityData.attributeData.length > 0) {
        hasDefinedAttributes = true;
      }
    });
    
    // If no attributes are defined, use the specialized method
    if (!hasDefinedAttributes) {
      console.log('normalizeData: No attributes defined in request, using specialized handling');
      // Pass the original data to the specialized method
      const result = this.normalizeDataBasicWithoutAttributes(data);
      // Preserve the original data in the result
      result.__original_data = [...data];
      return result;
    }
    
    // Find the primary entity to extract its ID for linking
    let primaryEntity: { name: string, idField: string } | null = null;
    Object.entries(entityAttributeMap).forEach(([entityName, entityData]) => {
      if ((entityData as any).isPrimaryEntity) {
        primaryEntity = {
          name: entityName,
          idField: (entityData as any).primaryIdAttribute || `${entityName}id`
        };
        console.log(`normalizeData: Found primary entity: ${primaryEntity.name} with ID field: ${primaryEntity.idField}`);
      }
    });
    
    // Build a set of requested attributes
    const requestedAttributes = new Set<string>();
    
    if (!hasDefinedAttributes) {
      console.log('normalizeData: No attributes defined in request, including all available attributes');
      // Add all attributes from the first data item
      if (data.length > 0) {
        Object.keys(data[0]).forEach(key => {
          // Filter out OData annotations
          if (!key.includes('@OData')) {
            requestedAttributes.add(key);
          }
        });
      }
    } else {
      Object.entries(entityAttributeMap).forEach(([entityName, entityData]) => {
        console.log(`Processing entity ${entityName} with alias ${entityData.entityAlias || 'none'}`);
        
        if (entityData && Array.isArray(entityData.attributeData)) {
          entityData.attributeData.forEach(attrData => {
            if (attrData && attrData.attributeLogicalName) {
              console.log(`- Processing attribute: ${attrData.attributeLogicalName}`);
              
              // Don't skip the primary ID - we need to include it
              // Changed from: Skip the primary ID to avoid duplication
              if (primaryEntity && primaryEntity.idField === attrData.attributeLogicalName) {
                console.log(`  Including entity ID field: ${attrData.attributeLogicalName}`);
                requestedAttributes.add(attrData.attributeLogicalName);
                return;
              }
              
              // Handle aliased columns
              if (attrData.alias) {
                console.log(`  Adding with explicit alias: ${attrData.alias}`);
                requestedAttributes.add(attrData.alias);
              } else if (entityData.entityAlias) {
                // Add with entity alias prefix
                const aliasedName = `${entityData.entityAlias}.${attrData.attributeLogicalName}`;
                console.log(`  Adding with entity alias: ${aliasedName}`);
                requestedAttributes.add(aliasedName);
              } else {
                // Add normal column
                console.log(`  Adding direct attribute: ${attrData.attributeLogicalName}`);
                requestedAttributes.add(attrData.attributeLogicalName);
              }
            }
          });
        }
      });
      
      // Always ensure we add the primary ID field when it exists
      if (primaryEntity && primaryEntity.idField) {
        requestedAttributes.add(primaryEntity.idField);
        console.log(`Explicitly adding primary ID field: ${primaryEntity.idField}`);
      }
    }
    
    console.log('normalizeData: Requested attributes:', Array.from(requestedAttributes));
    
    // Create header map for requested attributes only
    const header: { [key: string]: any } = {};
    
    // Add only the entity URL link column if primary entity was identified
    if (primaryEntity) {
      this.addEntityUrlToHeader(header);
    }
    
    requestedAttributes.forEach(key => {
      if (!key.includes('@')) {
        // Handle linked entity fields
        if (key.includes('.')) {
          const [alias, fieldName] = key.split('.');
          console.log(`Processing linked field ${key} (alias: ${alias}, field: ${fieldName})`);
          
          // Try to find the entity with this alias
          let entityName = '';
          if (entityAttributeMap) {
            Object.entries(entityAttributeMap).forEach(([name, data]) => {
              if (data.entityAlias === alias) {
                entityName = name;
                console.log(`Found entity ${entityName} with alias ${alias}`);
              }
            });
          }
          
          header[key] = {
            displayName: this.getDisplayName(fieldName),
            logicalName: key,
            type: this.inferType(key, data[0]?.[key])
          };
          
          console.log(`Header for ${key}: ${header[key].displayName} (${header[key].type})`);
        }
        // Handle regular fields
        else {
          header[key] = {
            displayName: this.getDisplayName(key),
            logicalName: key,
            type: this.inferType(key, data[0]?.[key])
          };
          
          console.log(`Header for ${key}: ${header[key].displayName} (${header[key].type})`);
        }
      }
    });
    
    console.log('normalizeData: Created header with', Object.keys(header).length, 'entries');
    
    // Create raw and formatted values for requested attributes only
    const rawValues: any[] = [];
    const formattedValues: any[] = [];
    
    data.forEach(item => {
      const rawItem: any = {};
      const formattedItem: any = {};
      
      // Initialize all requested attributes with null values
      requestedAttributes.forEach(key => {
        rawItem[key] = null;
        formattedItem[key] = null;
      });
      
      // Add entity URL link if primary entity is identified
      if (primaryEntity) {
        const entityIdValue = this.findEntityId(item, primaryEntity);
        if (entityIdValue) {
          this.addEntityUrlToItems(rawItem, formattedItem, primaryEntity, entityIdValue);
        }
      }
      
      // Process only requested attributes
      requestedAttributes.forEach(key => {
        if (item[key] !== undefined) {
          // Store the raw value
          rawItem[key] = item[key];
          
          // Look for a formatted value
          let formattedValue = item[key];
          const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
          
          console.log(`[XmlExecutorService:normalizeData] Processing key: ${key}, checking for formatted key: ${formattedKey}`);
          console.log(`[XmlExecutorService:normalizeData] Formatted key exists: ${!!item[formattedKey]}, value: ${item[formattedKey]}`);
          
          if (item[formattedKey]) {
            formattedValue = item[formattedKey];
            console.log(`[XmlExecutorService:normalizeData] Using formatted value: ${formattedValue} for key: ${key}`);
          }
          
          // Store the formatted value
          formattedItem[key] = formattedValue;
        }
      });
      
      rawValues.push(rawItem);
      formattedValues.push(formattedItem);
    });
    
    console.log('normalizeData: Processed', rawValues.length, 'records');
    
    // Remove duplicates
    const uniqueRawValues = this.getUniqueRecords(rawValues);
    const uniqueFormattedValues = this.getUniqueRecords(formattedValues);
    
    console.log('normalizeData: After deduplication:', uniqueRawValues.length, 'records');
    
    const result: XmlExecutionResult = {
      header,
      rawValues: uniqueRawValues,
      formatedValues: uniqueFormattedValues
    };
    
    console.log('[XmlExecutorService:normalizeData] Returning result with:',
      'header keys:', Object.keys(header).length,
      'raw values:', rawValues.length,
      'formatted values:', formattedValues.length);
    console.log('[XmlExecutorService:normalizeData] First raw item keys:', rawValues.length > 0 ? Object.keys(rawValues[0]) : 'No data');
    console.log('[XmlExecutorService:normalizeData] First formatted item keys:', formattedValues.length > 0 ? Object.keys(formattedValues[0]) : 'No data');
    
    // Final check to make sure header contains all data keys
    if (uniqueRawValues.length > 0) {
      const headerKeys = new Set(Object.keys(header));
      const dataKeys = new Set(Object.keys(uniqueRawValues[0]));
      
      // Find keys in data that aren't in header (excluding special keys)
      const missingInHeader = Array.from(dataKeys).filter(key => 
        !headerKeys.has(key) && key !== '__entity_url' && key !== '__raw_data'
      );
      
      if (missingInHeader.length > 0) {
        console.log('[XmlExecutorService:normalizeData] Keys in data but missing from header:', missingInHeader);
        
        // Add missing keys to header
        for (const key of missingInHeader) {
          header[key] = {
            displayName: this.getDisplayName(key),
            logicalName: key,
            type: this.inferType(key, uniqueRawValues[0][key])
          };
          console.log(`[XmlExecutorService:normalizeData] Added missing key to header: ${key}`);
        }
      }
    }
    
    // Apply the normalizeResultAttributes utility to ensure consistent attributes across all rows
    return normalizeResultAttributes(result);
  }
  
  // Helper method to infer the type of a field
  private inferType(key: string, value: any): string {
    // Handle lookup fields by name pattern
    if (key.startsWith('_') && key.endsWith('_value')) {
      return 'Lookup';
    }
    
    // Check specific known fields
    if (key === 'cr1fc_boolean' || key.toLowerCase().includes('boolean')) {
      console.log(`Detected boolean field by name: ${key}`);
      return 'Boolean';
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
  
  // Helper method to create a display name from a logical name
  private getDisplayName(key: string): string {
    // Handle lookup fields (_field_value)
    if (key.startsWith('_') && key.endsWith('_value')) {
      // Remove leading underscore and trailing _value
      const baseName = key.substring(1, key.length - 6);
      return this.formatFieldName(baseName);
    }
    
    // Handle linked entity fields (alias.field)
    if (key.includes('.')) {
      const parts = key.split('.');
      if (parts.length === 2) {
        // Get the field name part (after the dot)
        return this.formatFieldName(parts[1]);
      }
    }
    
    // Standard field formatting
    return this.formatFieldName(key);
  }
  
  // Format a field name into display name
  private formatFieldName(fieldName: string): string {
    // Remove entity prefix (e.g., cr1fc_)
    let displayName = fieldName.replace(/^[a-z0-9]+_/i, '');
    
    // Convert camelCase to Title Case with spaces
    return displayName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Specialized method for requests without defined attributes (without type information)
  private normalizeDataBasicWithoutAttributes<T extends { [key: string]: any }>(data: T[]): XmlExecutionResult {
    console.log('normalizeDataBasicWithoutAttributes: Starting specialized basic normalization');
    
    if (!data?.length) {
      console.log('normalizeDataBasicWithoutAttributes: No data to process');
      return { header: {}, rawValues: [], formatedValues: [], __original_data: [] };
    }
    
    try {
      // Create header, raw values, and formatted values
      const header: { [key: string]: any } = {};
      const rawValues: any[] = [];
      const formattedValues: any[] = [];
      
      // Get all entity names for identifying primary fields
      const entityAttributeMap = this.nodeTreeService.getEntityAttributeMap();
      
      // Find primary entity for linking if available
      let primaryEntity: { name: string, idField: string } | null = null;
      if (entityAttributeMap) {
        Object.entries(entityAttributeMap).forEach(([entityName, entityData]) => {
          if (entityData.isPrimaryEntity) {
            primaryEntity = {
              name: entityName,
              idField: entityData.primaryIdAttribute || `${entityName}id`
            };
            console.log(`normalizeDataBasicWithoutAttributes: Found primary entity: ${primaryEntity.name} with ID field: ${primaryEntity.idField}`);
          }
        });
      }
      
      // Add entity URL link column for Dynamics/Dataverse if primary entity was identified
      if (primaryEntity) {
        this.addEntityUrlToHeader(header);
      }
      
      // Process the data to identify standard fields 
      // Collect ALL attribute names from ALL records, not just first one
      const baseAttributes = new Set<string>();
      
      // Examine all records to find all possible attributes
      for (const record of data) {
        for (const key of Object.keys(record)) {
          // Skip only odata.etag annotation
          if (key === '@odata.etag') {
            continue;
          }
          
          // Extract base attribute name (before any @)
          const baseName = key.split('@')[0];
          baseAttributes.add(baseName);
        }
      }
      
      console.log(`normalizeDataBasicWithoutAttributes: Collected ${baseAttributes.size} unique attributes from all records`);
      
      // Create header entries for standard attributes
      baseAttributes.forEach(key => {
        // Don't skip entity IDs - include them in the header
        header[key] = {
          displayName: this.getDisplayName(key),
          logicalName: key,
          type: this.inferTypeFromData(key, data)
        };
        
        // Special handling for known ID fields
        if (primaryEntity && key === primaryEntity.idField) {
          console.log(`normalizeDataBasicWithoutAttributes: Explicitly adding primary ID field to header: ${key}`);
        }
      });
      
      // Process each data record
      data.forEach(item => {
        const rawItem: any = {};
        const formattedItem: any = {};
        
        // Initialize all attributes with null values first
        baseAttributes.forEach(key => {
          rawItem[key] = null;
          formattedItem[key] = null;
        });
        
        // Add entity URL field if primary entity is identified
        if (primaryEntity) {
          const entityIdValue = this.findEntityId(item, primaryEntity);
          if (entityIdValue) {
            this.addEntityUrlToItems(rawItem, formattedItem, primaryEntity, entityIdValue);
          }
        }
        
        // Add all standard fields (including lookups, excluding annotations)
        baseAttributes.forEach(key => {
          // Add raw value if it exists in this item
          if (item[key] !== undefined) {
            rawItem[key] = item[key];
            
            // Look for a formatted value
            const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
            if (item[formattedKey] !== undefined) {
              formattedItem[key] = item[formattedKey];
            } else {
              // For lookup fields (_*_value), check if there's a formatted value with a different pattern
              if (key.startsWith('_') && key.endsWith('_value')) {
                const lookupFormattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
                if (item[lookupFormattedKey] !== undefined) {
                  formattedItem[key] = item[lookupFormattedKey];
                } else {
                  formattedItem[key] = item[key];
                }
              } else {
                formattedItem[key] = item[key];
              }
            }
          }
          // No need to set null values - we already initialized them
        });
        
        rawValues.push(rawItem);
        formattedValues.push(formattedItem);
      });
      
      // Remove duplicates
      const uniqueRawValues = this.getUniqueRecords(rawValues);
      const uniqueFormattedValues = this.getUniqueRecords(formattedValues);
      
      console.log(`normalizeDataBasicWithoutAttributes: Final result - raw: ${uniqueRawValues.length}, formatted: ${uniqueFormattedValues.length}`);
      
      const result: XmlExecutionResult = {
        header,
        rawValues: uniqueRawValues,
        formatedValues: uniqueFormattedValues,
        __original_data: [...data] // Preserve the original data
      };
      
      // Final check to ensure header contains all data fields
      if (uniqueRawValues.length > 0) {
        const headerKeys = new Set(Object.keys(header));
        
        // Collect all keys from all rows
        const allDataKeys = new Set<string>();
        for (const row of uniqueRawValues) {
          for (const key of Object.keys(row)) {
            if (key !== '__entity_url' && key !== '__raw_data') {
              allDataKeys.add(key);
            }
          }
        }
        
        console.log('normalizeDataBasicWithoutAttributes: Header keys:', Array.from(headerKeys));
        console.log('normalizeDataBasicWithoutAttributes: All data keys:', Array.from(allDataKeys));
        
        // Check for keys in data but not in header
        const missingInHeader = Array.from(allDataKeys).filter(key => 
          !headerKeys.has(key) && key !== '__entity_url' && key !== '__raw_data'
        );
        
        if (missingInHeader.length > 0) {
          console.log('normalizeDataBasicWithoutAttributes: Missing in header:', missingInHeader);
          
          // Add missing keys to header
          for (const key of missingInHeader) {
            header[key] = {
              displayName: this.getDisplayName(key),
              logicalName: key,
              type: this.inferTypeFromData(key, uniqueRawValues)
            };
            console.log(`normalizeDataBasicWithoutAttributes: Added missing key to header: ${key}`);
          }
        }
        
        // Verify all data fields have corresponding header entries
        console.log('normalizeDataBasicWithoutAttributes: Header and data key match:',
          Object.keys(header).sort().join(',') === 
          Array.from(allDataKeys).filter(k => k !== '__entity_url' && k !== '__raw_data').sort().join(',')
        );
      }
      
      // Apply final normalization to ensure consistent attributes
      const normalizedResult = normalizeResultAttributes(result);
      
      // Make sure we preserve the original data
      normalizedResult.__original_data = result.__original_data;
      
      return normalizedResult;
    } catch (error) {
      console.error('Error in normalizeDataBasicWithoutAttributes:', error);
      return { header: {}, rawValues: [], formatedValues: [], __original_data: [] };
    }
  }
  
  // Helper method to infer type by examining all data rows
  private inferTypeFromData(fieldName: string, data: any[]): string {
    // Special cases based on field name patterns
    if (fieldName.toLowerCase().endsWith('id') || fieldName.toLowerCase().includes('guid')) {
      return 'Uniqueidentifier';
    }
    
    if (fieldName.toLowerCase().includes('boolean')) {
      return 'Boolean';
    }
    
    if (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('time')) {
      return 'DateTime';
    }
    
    if (fieldName.toLowerCase().includes('money') || 
        fieldName.toLowerCase().includes('price') || 
        fieldName.toLowerCase().includes('cost')) {
      return 'Money';
    }
    
    if (fieldName.startsWith('_') && fieldName.endsWith('_value')) {
      return 'Lookup';
    }
    
    // Try to find first non-null value to determine type
    for (const item of data) {
      const value = item[fieldName];
      if (value !== null && value !== undefined) {
        return this.inferType(fieldName, value);
      }
    }
    
    // Default to string if no values found
    return 'String';
  }
}