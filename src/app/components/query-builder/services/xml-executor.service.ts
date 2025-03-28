import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, catchError, tap } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class XmlExecutorService extends BaseRequestService {
  private readonly DEFAULT_PAGE_SIZE = 100;

  constructor(
    private nodeTreeService: NodeTreeService,
    private attributeEntityService: AttributeEntityService,
    private errorDialogService: ErrorDialogService,
    private environmentEntityService: EnvironmentEntityService
  ) { 
    super(); 
  }

  executeXmlRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}): Observable<any> {
    if (!xml || !entityNode) {
      console.error('XML and entity name are required');
      this.errorDialogService.showError({
        title: 'Invalid Query',
        message: 'XML and entity information are required',
        details: 'Please ensure you have a valid query with entity information before executing'
      });
      return of({ header: {}, rawValues: [], formatedValues: [] });
    }

    const xmlOptions = this.extractQueryOptions(xml);
    const mergedOptions = { ...xmlOptions, ...options };

    // Use pipe to modify return type since the original implementation returns 'any[]'
    // but we need to return { header, 'raw-values', 'formated-values' }
    return this.executeRequest(xml, entityNode, mergedOptions).pipe(
      // Just pass through the result
      map(result => {
        console.log('Final result being sent to component', result);
        
        return result;
      }),
      // Catch any errors at the top level
      catchError(error => {
        console.error('Top level error in executeXmlRequest:', error);
        return of({ header: {}, rawValues: [], formatedValues: [] });
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

  private executeRequest(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions): Observable<any> {
    return this.activeEnvironmentUrl$.pipe(
      switchMap(envUrl => {
        if (!envUrl) {
          console.error('No active environment URL found');
          this.errorDialogService.showError({
            title: 'Connection Error',
            message: 'No active environment URL found',
            details: 'Please connect to an environment before executing the query'
          });
          return of(null);
        }

        const sanitizedXml = this.sanitizeForTransmission(xml);
        const encodedXml = encodeURIComponent(sanitizedXml);
        const url = API_ENDPOINTS.execute.getResourceUrl(envUrl, entityNode.entitySetName$.value, encodedXml);
        
        const requestOptions = this.buildRequestOptions(options);

        return this.httpClient.get<XmlExecuteResultModel>(url, requestOptions).pipe(
          tap(result => {
            console.log('XML result:', result);
          }),
          switchMap(result => {
            if (!result?.value?.length) {
              return of({ header: {}, rawValues: [], formatedValues: [] });
            }
            
            // Process entities and attributes
            try {
              const entityAttributeMap = this.nodeTreeService.getEntityAttributeMap() as EntityAttributeMap;
              
              // Get attribute maps if available
              if (entityAttributeMap && Object.keys(entityAttributeMap).length > 0) {
                try {
                  return this.attributeEntityService.getSpecificAttributes(entityAttributeMap).pipe(
                    map(attributeMaps => {
                      console.log('Using normalizeDataWithTypes with attribute maps');
                      return this.normalizeDataWithTypes(result.value, attributeMaps, entityAttributeMap);
                    }),
                    catchError(error => {
                      console.error('Error retrieving attribute maps:', error);
                      console.log('Falling back to basic normalization');
                      return of(this.normalizeData(result.value, entityAttributeMap));
                    })
                  );
                } catch (error) {
                  console.error('Error in attribute service call:', error);
                  console.log('Falling back to basic normalization');
                  return of(this.normalizeData(result.value, entityAttributeMap));
                }
              }
              
              console.log('No entity attribute map, using normalizeData');
              return of(this.normalizeData(result.value, entityAttributeMap));
            } catch (error) {
              console.error('Error processing data:', error);
              return of({ header: {}, rawValues: [], formatedValues: [] });
            }
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Error executing XML request:', error.message);
            this.errorDialogService.showHttpError(error);
            return of({ header: {}, rawValues: [], formatedValues: [] });
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

  // Normalize data with attribute types from metadata
  private normalizeDataWithTypes<T extends { [key: string]: any }>(data: T[], attributeMaps: AttributeMapResult, passedEntityAttributeMap: EntityAttributeMap): any {
    console.log('normalizeDataWithTypes: Starting data normalization with types');
    
    if (!data?.length) {
      console.log('normalizeDataWithTypes: No data to process');
      return { header: {}, rawValues: [], formatedValues: [] };
    }
    
    try {
      // Create header, raw values, and formatted values
      const header: { [key: string]: any } = {};
      const rawValues: any[] = [];
      const formattedValues: any[] = [];
      const linkValues: any[] = [];
      
      // Use the passed entity attribute map
      const entityAttributeMap = passedEntityAttributeMap;
      if (!entityAttributeMap) {
        console.log('normalizeDataWithTypes: No entity attribute map found');
        return this.normalizeData(data, passedEntityAttributeMap);
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
        console.log('normalizeDataWithTypes: No attributes defined in request, using specialized handling');
        return this.normalizeDataWithoutAttributes(data, attributeMaps, passedEntityAttributeMap);
      }
      
      // Find the primary entity to extract its ID for linking
      let primaryEntity: { name: string, idField: string } | null = null;
      Object.entries(entityAttributeMap).forEach(([entityName, entityData]) => {
        if ((entityData as any).isPrimaryEntity) {
          primaryEntity = {
            name: entityName,
            idField: (entityData as any).primaryIdAttribute || `${entityName}id`
          };
          console.log(`Found primary entity: ${primaryEntity.name} with ID field: ${primaryEntity.idField}`);
        }
      });
      
      // Add entity URL link column for Dynamics/Dataverse if primary entity was identified
      if (primaryEntity) {
        this.addEntityUrlToHeader(header);
      }
      
      // Build a map of all requested attributes including those with aliases
      const allRequestedAttributes = new Set<string>();
      const aliasAttributeMap: Record<string, { attributeLogicalName: string, entityLogicalName: string }> = {};
      const entityAliasMap: Record<string, string> = {};
      
      // Process the entityAttributeMap to identify all requested attributes
      Object.entries(entityAttributeMap).forEach(([entityLogicalName, entityData]) => {
        // Store entity alias for later use
        if (entityData.entityAlias) {
          entityAliasMap[entityData.entityAlias] = entityLogicalName;
        }
        
        // Process attributes
        entityData.attributeData.forEach(attrData => {
          if (!attrData.attributeLogicalName) return;
          
          // Skip processing the primary ID attribute to avoid duplication
          if (primaryEntity && attrData.attributeLogicalName === primaryEntity.idField) {
            console.log(`Skipping primary ID attribute: ${attrData.attributeLogicalName}`);
            return;
          }
          
          // Handle different attribute reference scenarios
          if (attrData.alias) {
            // Case: Attribute with explicit alias
            allRequestedAttributes.add(attrData.alias);
            aliasAttributeMap[attrData.alias] = {
              attributeLogicalName: attrData.attributeLogicalName,
              entityLogicalName
            };
            console.log(`Added attribute with alias: ${attrData.alias} -> ${attrData.attributeLogicalName}`);
          } else if (entityData.entityAlias) {
            // Case: Attribute in linked entity with alias
            const aliasedName = `${entityData.entityAlias}.${attrData.attributeLogicalName}`;
            allRequestedAttributes.add(aliasedName);
            aliasAttributeMap[aliasedName] = {
              attributeLogicalName: attrData.attributeLogicalName,
              entityLogicalName
            };
            console.log(`Added linked entity attribute: ${aliasedName}`);
          } else {
            // Case: Direct attribute
            // Skip adding the entity's ID to avoid duplication
            if (primaryEntity && primaryEntity.idField === attrData.attributeLogicalName) {
              console.log(`Skipping entity ID field: ${attrData.attributeLogicalName}`);
              return;
            }
            allRequestedAttributes.add(attrData.attributeLogicalName);
            console.log(`Added direct attribute: ${attrData.attributeLogicalName}`);
          }
        });
      });
      
      console.log('Requested attributes:', Array.from(allRequestedAttributes));
      
      // Create header entries for all explicitly requested attributes
      allRequestedAttributes.forEach(key => {
        let attributeInfo = { displayName: '', type: '', logicalName: key, entityLogicalName: '' };
        
        // Check if it's an aliased attribute
        if (aliasAttributeMap[key]) {
          const { attributeLogicalName, entityLogicalName } = aliasAttributeMap[key];
          const entityAttributes = attributeMaps[entityLogicalName];
          
          if (entityAttributes && entityAttributes.has(attributeLogicalName)) {
            const attrMetadata = entityAttributes.get(attributeLogicalName)!;
            attributeInfo = {
              displayName: attrMetadata.displayName || this.getDisplayName(key),
              type: attrMetadata.attributeType || this.inferType(key, null),
              logicalName: key,
              entityLogicalName
            };
            console.log(`Found metadata for aliased attribute ${key}: ${attributeInfo.type}`);
          }
        } 
        // Check for direct attributes
        else {
          // Search in all entity attribute maps
          Object.entries(attributeMaps).some(([entityLogicalName, attributes]) => {
            if (attributes.has(key)) {
              const attrMetadata = attributes.get(key)!;
              attributeInfo = {
                displayName: attrMetadata.displayName || this.getDisplayName(key),
                type: attrMetadata.attributeType || this.inferType(key, null),
                logicalName: key,
                entityLogicalName
              };
              console.log(`Found metadata for direct attribute ${key}: ${attributeInfo.type}`);
              return true;
            }
            return false;
          });
        }
        
        // If we couldn't find metadata, try to infer from the data
        if (!attributeInfo.displayName) {
          attributeInfo.displayName = this.getDisplayName(key);
          
          // Try to get type from the data
          const sampleValue = data[0]?.[key];
          attributeInfo.type = this.inferType(key, sampleValue);
          console.log(`Inferred type for ${key}: ${attributeInfo.type}`);
        }
        
        // Store header info
        header[key] = {
          displayName: attributeInfo.displayName,
          logicalName: key,
          type: attributeInfo.type
        };
      });
      
      // Process each data record, but only include requested attributes
      data.forEach(item => {
        const rawItem: any = {};
        const formattedItem: any = {};
        
        // Initialize only requested attributes with null values
        allRequestedAttributes.forEach(key => {
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
        
        // Process only requested attributes in the data item
        allRequestedAttributes.forEach(key => {
          if (item[key] !== undefined) {
            // Store the raw value
            rawItem[key] = item[key];
            
            // Get formatted value if available
            const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
            if (item[formattedKey] !== undefined) {
              formattedItem[key] = item[formattedKey];
            } else {
              formattedItem[key] = item[key];
            }
          }
        });
        
        rawValues.push(rawItem);
        formattedValues.push(formattedItem);
      });
      
      // After processing each data record
      console.log(`normalizeDataWithTypes: Processed ${data.length} records into ${rawValues.length} raw values and ${formattedValues.length} formatted values`);
      
      // Remove duplicates
      const uniqueRawValues = this.getUniqueRecords(rawValues);
      const uniqueFormattedValues = this.getUniqueRecords(formattedValues);
      
      console.log(`normalizeDataWithTypes: Final result - raw: ${uniqueRawValues.length}, formatted: ${uniqueFormattedValues.length}`);
      
      // Create the final result
      const result = {
        header,
        rawValues: uniqueRawValues,
        formatedValues: uniqueFormattedValues
      };
      
      return result;
    } catch (error) {
      console.error('Error in normalizeDataWithTypes:', error);
      return { header: {}, rawValues: [], formatedValues: [] };
    }
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
  private normalizeData<T extends { [key: string]: any }>(data: T[], passedEntityAttributeMap: EntityAttributeMap): any {
    console.log('normalizeData: Starting basic normalization');
    
    if (!data?.length) {
      console.log('normalizeData: No data to process');
      return { header: {}, rawValues: [], formatedValues: [] };
    }
    
    // Use the passed entity attribute map
    const entityAttributeMap = passedEntityAttributeMap;
    if (!entityAttributeMap) {
      console.log('normalizeData: No entity attribute map found, cannot determine requested attributes');
      return { header: {}, rawValues: [], formatedValues: [] };
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
      return this.normalizeDataBasicWithoutAttributes(data);
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
              
              // Skip the primary ID to avoid duplication
              if (primaryEntity && primaryEntity.idField === attrData.attributeLogicalName) {
                console.log(`  Skipping entity ID field: ${attrData.attributeLogicalName}`);
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
          if (item[formattedKey]) {
            formattedValue = item[formattedKey];
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
    
    const result = {
      header,
      rawValues: uniqueRawValues,
      formatedValues: uniqueFormattedValues
    };
    
    return result;
  }
  
  // Helper method to infer the type of a field
  private inferType(key: string, value: any): string {
    // Handle lookup fields
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

  // Specialized method for requests without defined attributes (with type information)
  private normalizeDataWithoutAttributes<T extends { [key: string]: any }>(data: T[], attributeMaps: AttributeMapResult, passedEntityAttributeMap: EntityAttributeMap): any {
    console.log('normalizeDataWithoutAttributes: Starting specialized normalization with types');
    
    if (!data?.length) {
      console.log('normalizeDataWithoutAttributes: No data to process');
      return { header: {}, rawValues: [], formatedValues: [] };
    }
    
    try {
      // Create header, raw values, and formatted values
      const header: { [key: string]: any } = {};
      const rawValues: any[] = [];
      const formattedValues: any[] = [];
      
      // Use the passed entity attribute map
      const entityAttributeMap = passedEntityAttributeMap;
      
      // Find primary entity for linking if available
      let primaryEntity: { name: string, idField: string } | null = null;
      if (entityAttributeMap) {
        Object.entries(entityAttributeMap).forEach(([entityName, entityData]) => {
          if ((entityData as any).isPrimaryEntity) {
            primaryEntity = {
              name: entityName,
              idField: (entityData as any).primaryIdAttribute || `${entityName}id`
            };
          }
        });
      }
      
      // Add entity URL link column for Dynamics/Dataverse if primary entity was identified
      if (primaryEntity) {
        this.addEntityUrlToHeader(header);
      }
      
      // Process the data to identify and group standard fields
      const baseAttributes = new Map<string, { 
        key: string, 
        hasFormattedValue: boolean,
        entityLogicalName?: string
      }>();
      
      // Sample first record to identify fields
      const firstRecord = data[0];
      
      // Track field groups by base name
      for (const key of Object.keys(firstRecord)) {
        // Skip Odata annotation fields and lookup fields
        if (key.startsWith('_') || key === '@odata.etag') {
          continue;
        }
        
        // Extract base attribute name (before any @)
        const baseName = key.split('@')[0];
        
        // Skip if already processed
        if (baseAttributes.has(baseName)) {
          continue;
        }
        
        // Check for formatted value
        const formattedValueKey = `${baseName}@OData.Community.Display.V1.FormattedValue`;
        const hasFormattedValue = Object.keys(firstRecord).includes(formattedValueKey);
        
        // Identify potential entity type if applicable
        let entityLogicalName;
        if (attributeMaps) {
          // Look for this attribute in the available entity attribute maps
          Object.entries(attributeMaps).some(([entityName, attributes]) => {
            if (attributes.has(baseName)) {
              entityLogicalName = entityName;
              return true;
            }
            return false;
          });
        }
        
        baseAttributes.set(baseName, { 
          key: baseName, 
          hasFormattedValue,
          entityLogicalName
        });
      }
      
      // Create header entries for standard attributes
      baseAttributes.forEach(({ key, entityLogicalName }) => {
        // Skip entity IDs as they'll be handled by the URL
        if (primaryEntity && key === primaryEntity.idField) {
          return;
        }
        
        let attributeInfo = { 
          displayName: this.getDisplayName(key), 
          type: 'String',
          logicalName: key
        };
        
        // Get type info from metadata if available
        if (entityLogicalName && attributeMaps[entityLogicalName]?.has(key)) {
          const attrMetadata = attributeMaps[entityLogicalName].get(key)!;
          attributeInfo = {
            displayName: attrMetadata.displayName || this.getDisplayName(key),
            type: attrMetadata.attributeType || this.inferType(key, null),
            logicalName: key
          };
        } else {
          // Infer type from first record data
          const value = firstRecord[key];
          attributeInfo.type = this.inferType(key, value);
        }
        
        header[key] = {
          displayName: attributeInfo.displayName,
          logicalName: key,
          type: attributeInfo.type
        };
      });
      
      // Process each data record
      data.forEach(item => {
        const rawItem: any = {};
        const formattedItem: any = {};
        
        // Add entity URL field if primary entity is identified
        if (primaryEntity) {
          const entityIdValue = this.findEntityId(item, primaryEntity);
          if (entityIdValue) {
            this.addEntityUrlToItems(rawItem, formattedItem, primaryEntity, entityIdValue);
          }
        }
        
        // Add all standard fields (non-lookup, non-annotation)
        baseAttributes.forEach(({ key, hasFormattedValue }) => {
          // Add raw value
          if (item[key] !== undefined) {
            rawItem[key] = item[key];
            
            // Add formatted value if available
            if (hasFormattedValue) {
              const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
              formattedItem[key] = item[formattedKey] !== undefined ? item[formattedKey] : item[key];
            } else {
              formattedItem[key] = item[key];
            }
          } else {
            rawItem[key] = null;
            formattedItem[key] = null;
          }
        });
        
        rawValues.push(rawItem);
        formattedValues.push(formattedItem);
      });
      
      // Remove duplicates
      const uniqueRawValues = this.getUniqueRecords(rawValues);
      const uniqueFormattedValues = this.getUniqueRecords(formattedValues);
      
      console.log(`normalizeDataWithoutAttributes: Final result - raw: ${uniqueRawValues.length}, formatted: ${uniqueFormattedValues.length}`);
      
      const result = {
        header,
        rawValues: uniqueRawValues,
        formatedValues: uniqueFormattedValues
      };
      
      return result;
    } catch (error) {
      console.error('Error in normalizeDataWithoutAttributes:', error);
      return { header: {}, rawValues: [], formatedValues: [] };
    }
  }
  
  // Specialized method for requests without defined attributes (without type information)
  private normalizeDataBasicWithoutAttributes<T extends { [key: string]: any }>(data: T[]): any {
    console.log('normalizeDataBasicWithoutAttributes: Starting specialized basic normalization');
    
    if (!data?.length) {
      console.log('normalizeDataBasicWithoutAttributes: No data to process');
      return { header: {}, rawValues: [], formatedValues: [] };
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
          }
        });
      }
      
      // Add entity URL link column for Dynamics/Dataverse if primary entity was identified
      if (primaryEntity) {
        this.addEntityUrlToHeader(header);
      }
      
      // Process the data to identify standard fields
      const baseAttributes = new Set<string>();
      
      // Sample first record to identify fields
      const firstRecord = data[0];
      
      // Find all base attribute names (before any @)
      for (const key of Object.keys(firstRecord)) {
        // Skip Odata annotation fields and lookup fields
        if (key.startsWith('_') || key === '@odata.etag') {
          continue;
        }
        
        // Extract base attribute name (before any @)
        const baseName = key.split('@')[0];
        baseAttributes.add(baseName);
      }
      
      // Create header entries for standard attributes
      baseAttributes.forEach(key => {
        // Skip entity IDs as they'll be handled by the URL
        if (primaryEntity && key === primaryEntity.idField) {
          return;
        }
        
        header[key] = {
          displayName: this.getDisplayName(key),
          logicalName: key,
          type: this.inferType(key, firstRecord[key])
        };
      });
      
      // Process each data record
      data.forEach(item => {
        const rawItem: any = {};
        const formattedItem: any = {};
        
        // Add entity URL field if primary entity is identified
        if (primaryEntity) {
          const entityIdValue = this.findEntityId(item, primaryEntity);
          if (entityIdValue) {
            this.addEntityUrlToItems(rawItem, formattedItem, primaryEntity, entityIdValue);
          }
        }
        
        // Add all standard fields (non-lookup, non-annotation)
        baseAttributes.forEach(key => {
          // Add raw value
          if (item[key] !== undefined) {
            rawItem[key] = item[key];
            
            // Look for a formatted value
            const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
            if (item[formattedKey] !== undefined) {
              formattedItem[key] = item[formattedKey];
            } else {
              formattedItem[key] = item[key];
            }
          } else {
            rawItem[key] = null;
            formattedItem[key] = null;
          }
        });
        
        rawValues.push(rawItem);
        formattedValues.push(formattedItem);
      });
      
      // Remove duplicates
      const uniqueRawValues = this.getUniqueRecords(rawValues);
      const uniqueFormattedValues = this.getUniqueRecords(formattedValues);
      
      console.log(`normalizeDataBasicWithoutAttributes: Final result - raw: ${uniqueRawValues.length}, formatted: ${uniqueFormattedValues.length}`);
      
      const result = {
        header,
        rawValues: uniqueRawValues,
        formatedValues: uniqueFormattedValues
      };
      
      return result;
    } catch (error) {
      console.error('Error in normalizeDataBasicWithoutAttributes:', error);
      return { header: {}, rawValues: [], formatedValues: [] };
    }
  }
}