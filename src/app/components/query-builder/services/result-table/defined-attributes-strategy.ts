import { XmlExecutionResult } from '../xml-executor.service';
import { EntityAttributeMap, AttributeEntityService } from '../entity-services/attribute-entity.service';
import { ResultProcessingStrategy } from './result-processing-strategy';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, from, map, catchError, of } from 'rxjs';

/**
 * Strategy for processing results when attributes are explicitly defined in the query.
 * This ensures we include all requested attributes in the result, even if they have no data.
 */
@Injectable()
export class DefinedAttributesStrategy implements ResultProcessingStrategy {
  
  constructor(private attributeEntityService?: AttributeEntityService) {}
  
  /**
   * Load all attributes for the given entities using the AttributeEntityService
   * @param entityLogicalNames Array of entity logical names to load attributes for
   * @returns Promise that resolves with a map of entity logical names to their attribute metadata
   */
  async loadAllAttributes(entityLogicalNames: string[]): Promise<{ [entityLogicalName: string]: Map<string, AttributeModel> }> {
    if (!this.attributeEntityService) {
      console.error('[DefinedAttributesStrategy] AttributeEntityService not injected, cannot load attributes');
      return {};
    }
    
    console.log(`[DefinedAttributesStrategy] Loading all attributes for entities: ${entityLogicalNames.join(', ')}`);
    
    try {
      // Create an empty map to store results
      const attributesMap: { [entityLogicalName: string]: Map<string, AttributeModel> } = {};
      
      // Process each entity
      for (const entityName of entityLogicalNames) {
        console.log(`[DefinedAttributesStrategy] Loading attributes for entity: ${entityName}`);
        
        // Get all attributes for this entity
        const attributes = await firstValueFrom(this.attributeEntityService.getAttributes(entityName));
        
        // Create a map of attribute logical name to attribute model
        const attributeMap = new Map<string, AttributeModel>();
        attributes.forEach(attr => {
          attributeMap.set(attr.logicalName, attr);
        });
        
        console.log(`[DefinedAttributesStrategy] Loaded ${attributeMap.size} attributes for entity: ${entityName}`);
        
        // Add to the results map
        attributesMap[entityName] = attributeMap;
      }
      
      return attributesMap;
    } catch (error) {
      console.error(`[DefinedAttributesStrategy] Error loading attributes:`, error);
      return {};
    }
  }
  
  /**
   * Process result with complete data loading and processing in a single step
   * This method will only load attributes defined in the query
   */
  processResultsWithData(
    result: XmlExecutionResult,
    entityAttributeMap: EntityAttributeMap
  ): Observable<XmlExecutionResult> {
    if (!result || !result.rawValues || result.rawValues.length === 0) {
      console.log('[DefinedAttributesStrategy] No result data to process in processResultsWithData, returning original result');
      return of(result);
    }
    
    if (!this.attributeEntityService) {
      console.error('[DefinedAttributesStrategy] AttributeEntityService not injected, cannot load attributes');
      return of(result);
    }
    
    console.log('[DefinedAttributesStrategy] Starting processResultsWithData for', 
      Object.keys(entityAttributeMap).length, 'entities');
    
    // For defined attributes strategy, we'll use the getSpecificAttributes method
    // which only loads attributes defined in the entityAttributeMap
    return this.attributeEntityService.getSpecificAttributes(entityAttributeMap).pipe(
      map(attributeMaps => {
        console.log('[DefinedAttributesStrategy] Loaded specific attributes for', 
          Object.keys(attributeMaps).length, 'entities');
        
        // Process the result with the attribute maps
        return this.processResults(result, entityAttributeMap, attributeMaps);
      }),
      catchError(error => {
        console.error('[DefinedAttributesStrategy] Error in processResultsWithData:', error);
        
        // Return the original result if there's an error
        return of(result);
      })
    );
  }
  
  processResults(
    result: XmlExecutionResult, 
    entityAttributeMap: EntityAttributeMap,
    attributeMaps?: { [entityLogicalName: string]: Map<string, AttributeModel> }
  ): XmlExecutionResult {
    console.log('[DefinedAttributesStrategy] Starting processResults', {
      resultAvailable: !!result,
      hasRawValues: result?.rawValues?.length > 0,
      entityAttributeMap: JSON.stringify(entityAttributeMap),
      attributeMapsAvailable: !!attributeMaps,
      attributeMapsEntityCount: attributeMaps ? Object.keys(attributeMaps).length : 0
    });

    if (!result || !result.rawValues || result.rawValues.length === 0) {
      console.log('[DefinedAttributesStrategy] No result data to process, returning original result');
      return result;
    }

    // Clone the result to avoid modifying the original
    const processedResult: XmlExecutionResult = {
      header: {}, // Start with an empty header
      rawValues: [],
      formatedValues: []
    };
    
    console.log('[DefinedAttributesStrategy] Initial header keys:', Object.keys(result.header));
    console.log('[DefinedAttributesStrategy] Initial raw values keys for first row:', 
      result.rawValues.length > 0 ? Object.keys(result.rawValues[0]) : 'No raw values');
    
    // If we don't have loaded attribute maps and we have the service, try loading them now (asynchronously)
    if ((!attributeMaps || Object.keys(attributeMaps).length === 0) && this.attributeEntityService) {
      console.log('[DefinedAttributesStrategy] No attribute maps available, will load attributes asynchronously');
      
      // Get entity names from the entityAttributeMap
      const entityNames = Object.keys(entityAttributeMap);
      
      // Start loading attributes in the background - will complete in a future execution
      this.loadAllAttributes(entityNames).then(loadedAttributes => {
        console.log(`[DefinedAttributesStrategy] Loaded ${Object.keys(loadedAttributes).length} entity attribute maps asynchronously`);
      }).catch(error => {
        console.error('[DefinedAttributesStrategy] Error loading attributes asynchronously:', error);
      });
      
      // For now, return the original result since we can't process without metadata
      console.log('[DefinedAttributesStrategy] Cannot process without metadata, returning original result');
      return result;
    }
    
    // We need to check if there was an original raw data before normalization
    // This might help us find values for fields that seem to be missing
    const originalData: any = result['__original_data'] || [];
    const hasOriginalData = Array.isArray(originalData) && originalData.length > 0;
    
    if (hasOriginalData) {
      console.log('[DefinedAttributesStrategy] Found original data, will check for missing values there');
      
      // Check for lookup fields in the first original record, if available
      if (originalData.length > 0) {
        const firstOriginalRow = originalData[0];
        // Log all the keys in the original data to help with debugging
        console.log('[DefinedAttributesStrategy] Original data keys:', Object.keys(firstOriginalRow));
      }
    }
    
    // Create a mapping from metadata field name to raw data field name
    // e.g., 'ownerid' -> '_ownerid_value'
    const fieldNameMapping = new Map<string, string>();
    
    // Get all available attributes from metadata - these are the ONLY attributes we'll include
    const metadataAttributes: Map<string, AttributeModel> = new Map<string, AttributeModel>();
    
    // Process metadata to get the complete list of attributes
    console.log('[DefinedAttributesStrategy] Processing attribute metadata');
    
    for (const entityName of Object.keys(attributeMaps)) {
      const entityAttributes = attributeMaps[entityName];
      if (entityAttributes) {
        console.log(`[DefinedAttributesStrategy] Processing metadata for entity: ${entityName}, found ${entityAttributes.size} attributes`);
        
        // Add all attributes to our map
        for (const [attrName, attrModel] of entityAttributes.entries()) {
          metadataAttributes.set(attrName, attrModel);
          
          // For lookup fields, map from the metadata name to the raw data name
          if (attrModel.attributeType === 'Lookup' || attrModel.attributeType === 'Owner') {
            const rawFieldName = `_${attrName}_value`;
            fieldNameMapping.set(attrName, rawFieldName);
            console.log(`[DefinedAttributesStrategy] Mapped lookup field ${attrName} to ${rawFieldName}`);
          }
        }
      }
    }
    
    console.log(`[DefinedAttributesStrategy] Collected ${metadataAttributes.size} total attributes from metadata`);

    // Add __entity_url to our header and attribute list (special case)
    processedResult.header['__entity_url'] = result.header['__entity_url'] || {
      displayName: 'Entity URL',
      logicalName: '__entity_url',
      type: 'string'
    };
    
    // Create header from metadata attributes ONLY
    for (const [attrName, attrModel] of metadataAttributes.entries()) {
      processedResult.header[attrName] = {
        displayName: attrModel.displayName || this.formatDisplayName(attrName),
        logicalName: attrName,
        type: attrModel.attributeType || 'string'
      };
    }
    
    console.log(`[DefinedAttributesStrategy] Created header with ${Object.keys(processedResult.header).length} attributes`);
    
    // Process raw values - only include attributes that are in the metadata
    for (let i = 0; i < result.rawValues.length; i++) {
      const originalRow = result.rawValues[i];
      const originalDataRow = hasOriginalData && i < originalData.length ? originalData[i] : null;
      const newRow: any = {};
      
      // Always include __entity_url
      if ('__entity_url' in originalRow) {
        newRow['__entity_url'] = originalRow['__entity_url'];
      }
      
      // Only include attributes that are in the metadata
      for (const attrName of metadataAttributes.keys()) {
        // First check if the attribute exists in the normalized data
        if (attrName in originalRow) {
          newRow[attrName] = originalRow[attrName];
        } 
        // Check if we need to use a mapped field name for lookups
        else if (fieldNameMapping.has(attrName) && originalDataRow) {
          const rawFieldName = fieldNameMapping.get(attrName);
          
          // Check if the mapped field exists in the original data
          if (rawFieldName && rawFieldName in originalDataRow) {
            newRow[attrName] = originalDataRow[rawFieldName];
            console.log(`[DefinedAttributesStrategy] Found value for ${attrName} using mapped field ${rawFieldName}: ${newRow[attrName]}`);
          } else {
            newRow[attrName] = null;
          }
        }
        // Check if it exists in the original data (for fields like boolean that might be false)
        else if (originalDataRow && attrName in originalDataRow) {
          newRow[attrName] = originalDataRow[attrName];
        }
        // Check for alternative formats in the original data (like cr1fc_boolean@OData.*)
        else if (originalDataRow) {
          // Look for the field with any OData suffix
          const odataKey = Object.keys(originalDataRow).find(key => 
            key.startsWith(attrName + '@')
          );
          
          if (odataKey) {
            // Extract the actual value from a related field without the suffix
            newRow[attrName] = originalDataRow[attrName] !== undefined 
              ? originalDataRow[attrName] 
              : null;
            
            // Log that we found a value in an OData annotated field
            if (newRow[attrName] !== null) {
              console.log(`[DefinedAttributesStrategy] Found value for ${attrName} in OData field ${odataKey}`);
            }
          } else {
            // Otherwise set to null
            newRow[attrName] = null;
          }
        } else {
          // Otherwise set to null
          newRow[attrName] = null;
        }
      }
      
      processedResult.rawValues.push(newRow);
    }
    
    // Process formatted values - only include attributes that are in the metadata
    if (result.formatedValues && result.formatedValues.length > 0) {
      for (let i = 0; i < result.formatedValues.length; i++) {
        const originalRow = result.formatedValues[i];
        const originalDataRow = hasOriginalData && i < originalData.length ? originalData[i] : null;
        const newRow: any = {};
        
        // Always include __entity_url
        if ('__entity_url' in originalRow) {
          newRow['__entity_url'] = originalRow['__entity_url'];
        }
        
        // Only include attributes that are in the metadata
        for (const attrName of metadataAttributes.keys()) {
          // First check in normalized data
          if (attrName in originalRow) {
            newRow[attrName] = originalRow[attrName];
          } 
          // Check if we need to use a mapped field name for lookups
          else if (fieldNameMapping.has(attrName) && originalDataRow) {
            const rawFieldName = fieldNameMapping.get(attrName);
            
            // For formatted values, check for the formatted value annotation
            if (rawFieldName) {
              const formattedKey = `${rawFieldName}@OData.Community.Display.V1.FormattedValue`;
              
              if (originalDataRow[formattedKey]) {
                newRow[attrName] = originalDataRow[formattedKey];
                console.log(`[DefinedAttributesStrategy] Found formatted value for ${attrName} using mapped field ${formattedKey}: ${newRow[attrName]}`);
              } else {
                newRow[attrName] = null;
              }
            } else {
              newRow[attrName] = null;
            }
          }
          // Check in original data
          else if (originalDataRow) {
            const formattedKey = `${attrName}@OData.Community.Display.V1.FormattedValue`;
            
            if (formattedKey in originalDataRow) {
              newRow[attrName] = originalDataRow[formattedKey];
              
              if (newRow[attrName] !== null) {
                console.log(`[DefinedAttributesStrategy] Found formatted value for ${attrName}: ${newRow[attrName]}`);
              }
            } else {
              // For boolean values, add formatted text
              if (originalDataRow[attrName] === true) {
                newRow[attrName] = 'Yes';
              } else if (originalDataRow[attrName] === false) {
                newRow[attrName] = 'No';
              } else {
                newRow[attrName] = null;
              }
            }
          } else {
            newRow[attrName] = null;
          }
        }
        
        processedResult.formatedValues.push(newRow);
      }
    }
    
    console.log('[DefinedAttributesStrategy] Final header keys:', Object.keys(processedResult.header));
    console.log('[DefinedAttributesStrategy] Final raw values keys for first row:', 
      Object.keys(processedResult.rawValues[0]));
    console.log('[DefinedAttributesStrategy] Final formatted values keys for first row:', 
      processedResult.formatedValues.length > 0 ? Object.keys(processedResult.formatedValues[0]) : 'No formatted values');

    return processedResult;
  }
  
  // Helper method to format attribute name to display name
  private formatDisplayName(attribute: string): string {
    // Remove common prefixes (e.g. cr1fc_)
    let displayName = attribute.replace(/^[a-z0-9]+_/i, '');
    
    // Handle lookup fields (_field_value)
    if (attribute.startsWith('_') && attribute.endsWith('_value')) {
      displayName = attribute.substring(1, attribute.length - 6);
    }
    
    // Convert camelCase or snake_case to Title Case with spaces
    return displayName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
} 