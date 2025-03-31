import { XmlExecutionResult } from '../xml-executor.service';
import { EntityAttributeMap, AttributeEntityService, AttributeMapResult } from '../entity-services/attribute-entity.service';
import { IResultProcessingStrategy } from './i-result-processing-strategy';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, from, map, catchError, of } from 'rxjs';

/**
 * Helper function to normalize result attributes by ensuring all rows have consistent fields
 */
export function normalizeResultAttributes(result: XmlExecutionResult, metadataAttributes?: { [logicalName: string]: any }): XmlExecutionResult 
{
  if (!result || !result.rawValues || result.rawValues.length === 0) {
    console.log('[normalizeResultAttributes] No data to process, returning original result');
    return result;
  }

  // Clone the result to avoid modifying the original
  const processedResult: XmlExecutionResult = {
    header: { ...result.header },
    rawValues: [...result.rawValues],
    formattedValues: result.formattedValues ? [...result.formattedValues] : [],
    __original_data: result.__original_data ? [...result.__original_data] : []
  };

  // Get the original data if available
  const originalData = processedResult.__original_data || [];
  const hasOriginalData = Array.isArray(originalData) && originalData.length > 0;

  // Create mapping for lookup fields
  const fieldNameMapping = new Map<string, string>();

  // If we have metadata attributes, set up lookup field mapping
  if (metadataAttributes) {
    for (const [attrName, attrModel] of Object.entries(metadataAttributes)) {
      if (attrModel.attributeType === 'Lookup' || attrModel.attributeType === 'Owner') {
        const rawFieldName = `_${attrName}_value`;
        fieldNameMapping.set(attrName, rawFieldName);
        console.log(`[normalizeResultAttributes] Mapped lookup field ${attrName} to ${rawFieldName}`);
      }
    }
  }

  // Collect all unique attribute names across ALL data rows
  const allAttributes = new Set<string>();
  for (const row of processedResult.rawValues) {
    for (const key of Object.keys(row)) {
      if (key !== '__entity_url' && key !== '__raw_data') {
        allAttributes.add(key);
      }
    }
  }
  console.log(`[normalizeResultAttributes] Found ${allAttributes.size} unique attributes across all data rows`);

  // Add metadata attributes to the set if provided
  if (metadataAttributes) {
    let metadataAttrCount = 0;

    for (const attrName of Object.keys(metadataAttributes)) {
      allAttributes.add(attrName);
      metadataAttrCount++;
    }
    console.log(`[normalizeResultAttributes] Added ${metadataAttrCount} metadata attributes, total unique attributes: ${allAttributes.size}`);
  }

  // Make sure all found attributes exist in the header
  const headerKeys = new Set(Object.keys(processedResult.header));
  for (const attr of allAttributes) {
    if (!headerKeys.has(attr)) {
      let displayName = formatDisplayName(attr);
      let inferredType = 'string';

      // First check if we have metadata for this attribute
      if (metadataAttributes && metadataAttributes[attr]) {
        const metadata = metadataAttributes[attr];
        inferredType = metadata.attributeType || inferredType;
        displayName = metadata.displayName || displayName;
        console.log(`[normalizeResultAttributes] Using metadata for attribute: ${attr}, type: ${inferredType}`);
      } else {
        // Infer type from the first non-null value found
        for (const row of processedResult.rawValues) {
          if (row[attr] !== null && row[attr] !== undefined) {
            inferredType = inferType(attr, row[attr]);
            break;
          }
        }
      }

      processedResult.header[attr] = {
        displayName: displayName,
        logicalName: attr,
        type: inferredType
      };
      console.log(`[normalizeResultAttributes] Added missing attribute to header: ${attr} (${inferredType})`);
    }
  }

  // Ensure all rows have all attributes, checking original data for lookup fields
  for (let i = 0; i < processedResult.rawValues.length; i++) {
    const row = processedResult.rawValues[i];
    const originalDataRow = hasOriginalData && i < originalData.length ? originalData[i] : null;

    for (const attr of allAttributes) {
      if (!(attr in row)) {
        // Check if this is a lookup field that we need to get from original data
        if (fieldNameMapping.has(attr) && originalDataRow) {
          const rawFieldName = fieldNameMapping.get(attr);

          if (rawFieldName && originalDataRow[rawFieldName] !== undefined) {
            row[attr] = originalDataRow[rawFieldName];
            console.log(`[normalizeResultAttributes] Added lookup field ${attr} from raw field ${rawFieldName}: ${row[attr]}`);
          } else {
            row[attr] = null;
          }
        } else {
          row[attr] = null;
        }
      }

      if (processedResult.formattedValues && processedResult.formattedValues[i]) {
        const formattedRow = processedResult.formattedValues[i];

        if (!(attr in formattedRow)) {
          // Check if this is a lookup field that we need to get from original data
          if (fieldNameMapping.has(attr) && originalDataRow) {
            const rawFieldName = fieldNameMapping.get(attr);

            if (rawFieldName) {
              const formattedKey = `${rawFieldName}@OData.Community.Display.V1.FormattedValue`;

              if (originalDataRow[formattedKey] !== undefined) {
                formattedRow[attr] = originalDataRow[formattedKey];
                console.log(`[normalizeResultAttributes] Added formatted lookup field ${attr} from ${formattedKey}: ${formattedRow[attr]}`);
              } else {
                formattedRow[attr] = null;
              }
            } else {
              formattedRow[attr] = null;
            }
          } else {
            formattedRow[attr] = null;
          }
        }
      }
    }
  }

  console.log(`[normalizeResultAttributes] Normalization complete. Header has ${Object.keys(processedResult.header).length} attributes`);

  return processedResult;
}

/**
 * Helper function to infer the type of a field based on its name and value
 */
function inferType(attributeName: string, value: any): string {
  // Special case handling based on attribute name
  if (attributeName.toLowerCase().endsWith('id') ||
    attributeName.toLowerCase().includes('guid')) {
    return 'uniqueidentifier';
  }

  if (attributeName.toLowerCase().includes('boolean') ||
    attributeName.toLowerCase().includes('flag')) {
    return 'boolean';
  }

  if (attributeName.toLowerCase().includes('date') ||
    attributeName.toLowerCase().includes('time')) {
    return 'datetime';
  }

  if (attributeName.toLowerCase().includes('money') ||
    attributeName.toLowerCase().includes('price') ||
    attributeName.toLowerCase().includes('cost')) {
    return 'money';
  }

  if (attributeName.startsWith('_') && attributeName.endsWith('_value')) {
    return 'lookup';
  }

  // Infer from value type
  if (value !== null && value !== undefined) {
    if (typeof value === 'number') {
      if (attributeName.toLowerCase().includes('price') ||
        attributeName.toLowerCase().includes('amount') ||
        attributeName.toLowerCase().includes('cost')) {
        return 'money';
      }
      return 'number';
    } else if (typeof value === 'boolean') {
      return 'boolean';
    } else if (value instanceof Date) {
      return 'datetime';
    } else if (typeof value === 'string') {
      // Check for GUID format
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return 'uniqueidentifier';
      }

      // Check for ISO date format
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'datetime';
      }
    }
  }

  // Default to string if no type could be inferred
  return 'string';
}

/**
 * Helper function to format attribute name to display name
 */
function formatDisplayName(attribute: string): string {
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

/**
 * Helper function to check if a value is likely a formatted lookup ID reference
 * and extract the actual display name if possible
 */
function cleanupFormattedLookupValue(value: any): any {
  // If not a string or is null/undefined, just return it
  if (typeof value !== 'string' || value === null || value === undefined) {
    return value;
  }
  
  // Check for "ID: GUID" pattern and extract the GUID
  if (value.startsWith('ID:') && value.includes('-')) {
    // Extract the GUID from the ID: format
    const guidMatch = value.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (guidMatch && guidMatch[1]) {
      // Return the actual GUID instead of empty string
      return guidMatch[1];
    }
  }
  
  return value;
}

/**
 * Strategy for processing results when no attributes are explicitly defined in the query.
 * This strategy attempts to fetch and include all available attributes for the entity and its related entities.
 */
@Injectable()
export class AllAttributesStrategy implements IResultProcessingStrategy {

  constructor(private attributeEntityService: AttributeEntityService) { }

  /**
   * New integrated method that takes raw data and processes it in one step,
   * including normalization, entity URL generation, and attribute processing.
   * 
   * @param rawData The original raw data from the API
   * @param entityAttributeMap Map of entity logical names to their attribute data
   * @param primaryEntity Primary entity information for URL generation
   * @param findEntityIdFn Function to find entity ID in a record
   * @param addEntityUrlFn Function to add entity URL to items
   * @returns Observable of the processed result
   */
  processRawData(
    rawData: XmlExecutionResult,
    entityAttributeMap: EntityAttributeMap,
    primaryEntity: { name: string, idField: string } | null,
    findEntityIdFn: (item: any, primaryEntity: { name: string, idField: string }) => string | null,
    addEntityUrlFn: (rawItem: any, formattedItem: any, primaryEntity: { name: string, idField: string }, entityIdValue: string) => void
  ): Observable<XmlExecutionResult> {
    console.log('[AllAttributesStrategy] Processing raw data with integrated method');
    
    if (!rawData || !rawData.rawValues || rawData.rawValues.length === 0) {
      console.log('[AllAttributesStrategy] No data to process');
      return of(rawData);
    }
    
    // Extract entity names from the entity attribute map
    const entityNames = Object.keys(entityAttributeMap);
    if (entityNames.length === 0) {
      console.log('[AllAttributesStrategy] No entities found in entityAttributeMap');
      return of(rawData);
    }
    
    // Only process the primary entity when using AllAttributesStrategy
    // This is because in FetchXML, if no attributes are specified for linked entities,
    // they shouldn't be included in the result
    const entitiesToProcess = primaryEntity ? [primaryEntity.name] : [entityNames[0]];
    console.log(`[AllAttributesStrategy] Will only process attributes for primary entity: ${entitiesToProcess[0]}`);
    
    // Step 1: Load attribute metadata first (more efficient)
    return from(this.loadAllAttributes(entitiesToProcess)).pipe(
      map(attributeMaps => {
        console.log('[AllAttributesStrategy] Loaded attribute maps for normalization:', 
          Object.keys(attributeMaps).length, 'entities');
        
        // Flatten attribute maps for use with normalizeResultAttributes
        const metadataAttributes: { [logicalName: string]: any } = {};
        for (const entityName of Object.keys(attributeMaps)) {
          const entityAttributes = attributeMaps[entityName];
          if (entityAttributes) {
            for (const [attrName, attrModel] of entityAttributes.entries()) {
              metadataAttributes[attrName] = attrModel;
            }
          }
        }
        
        // Step 2: Normalize the result with attribute metadata
        const normalizedResult = normalizeResultAttributes(rawData, metadataAttributes);
        
        // Step 3: Add entity URLs if primary entity is available
        if (primaryEntity) {
          const originalData = rawData.__original_data || [];
          normalizedResult.rawValues.forEach((item, index) => {
            if (index < originalData.length) {
              const entityIdValue = findEntityIdFn(originalData[index], primaryEntity);
              if (entityIdValue && !item.__entity_url) {
                addEntityUrlFn(
                  item, 
                  normalizedResult.formattedValues[index], 
                  primaryEntity, 
                  entityIdValue
                );
              }
            }
          });
        }
        
        // Step 4: Process with metadata attributes already loaded
        return this.processResults(normalizedResult, entityAttributeMap, attributeMaps, entitiesToProcess);
      }),
      catchError(error => {
        console.error('[AllAttributesStrategy] Error in processRawData:', error);
        
        // If there's an error loading attributes, fall back to the original approach
        const normalizedResult = normalizeResultAttributes(rawData);
        
        // Add entity URLs if primary entity is available
        if (primaryEntity) {
          const originalData = rawData.__original_data || [];
          normalizedResult.rawValues.forEach((item, index) => {
            if (index < originalData.length) {
              const entityIdValue = findEntityIdFn(originalData[index], primaryEntity);
              if (entityIdValue && !item.__entity_url) {
                addEntityUrlFn(
                  item, 
                  normalizedResult.formattedValues[index], 
                  primaryEntity, 
                  entityIdValue
                );
              }
            }
          });
        }
        
        return of(normalizedResult);
      })
    );
  }

  /**
   * Load all attributes for the given entities using the AttributeEntityService
   * @param entityLogicalNames Array of entity logical names to load attributes for
   * @returns Promise that resolves with a map of entity logical names to their attribute metadata
   */
  async loadAllAttributes(entityLogicalNames: string[]): Promise<{ [entityLogicalName: string]: Map<string, AttributeModel> }> {
    console.log(`[AllAttributesStrategy] Loading all attributes for entities: ${entityLogicalNames.join(', ')}`);

    try {
      // Create an empty map to store results
      const attributesMap: { [entityLogicalName: string]: Map<string, AttributeModel> } = {};

      // Process each entity
      for (const entityName of entityLogicalNames) {
        console.log(`[AllAttributesStrategy] Loading attributes for entity: ${entityName}`);

        // Get all attributes for this entity
        const attributes = await firstValueFrom(this.attributeEntityService.getAttributes(entityName));

        // Create a map of attribute logical name to attribute model
        const attributeMap = new Map<string, AttributeModel>();
        attributes.forEach(attr => {
          attributeMap.set(attr.logicalName, attr);
        });

        console.log(`[AllAttributesStrategy] Loaded ${attributeMap.size} attributes for entity: ${entityName}`);

        // Add to the results map
        attributesMap[entityName] = attributeMap;
      }

      return attributesMap;
    } catch (error) {
      console.error(`[AllAttributesStrategy] Error loading attributes:`, error);
      return {};
    }
  }

  /**
   * Process result with complete data loading and processing in a single step
   * This avoids duplicate data loading and processing by handling the attribute loading within the strategy
   */
  processResults(
    result: XmlExecutionResult,
    entityAttributeMap: EntityAttributeMap,
    attributeMaps?: { [entityLogicalName: string]: Map<string, AttributeModel> },
    entitiesToProcess?: string[]
  ): XmlExecutionResult {
    console.log('[AllAttributesStrategy] Starting processResults', {
      resultAvailable: !!result,
      hasRawValues: result?.rawValues?.length > 0,
      entityAttributeMap: JSON.stringify(entityAttributeMap),
      attributeMapsAvailable: !!attributeMaps,
      attributeMapsEntityCount: attributeMaps ? Object.keys(attributeMaps).length : 0,
      entitiesToProcess: entitiesToProcess?.join(', ')
    });

    if (!result || !result.rawValues || result.rawValues.length === 0) {
      console.log('[AllAttributesStrategy] No result data to process, returning original result');
      return result;
    }

    // Clone the result to avoid modifying the original
    const processedResult: XmlExecutionResult = {
      header: {},  // Start with an empty header
      rawValues: [],
      formattedValues: [],
      __original_data: result.__original_data
    };

    console.log('[AllAttributesStrategy] Initial header keys:', Object.keys(result.header));
    console.log('[AllAttributesStrategy] Initial raw values keys for first row:',
      result.rawValues.length > 0 ? Object.keys(result.rawValues[0]) : 'No raw values');

    // Get entity names from entitiesToProcess if available, otherwise use the primary entity from entityAttributeMap
    const entityNames = entitiesToProcess || 
      (Object.keys(entityAttributeMap).length > 0 ? [Object.keys(entityAttributeMap)[0]] : []);
    
    // If we don't have attribute maps, try to load them on-demand
    if (!attributeMaps || Object.keys(attributeMaps).length === 0) {
      // For the first entity only (primary entity)
      const primaryEntity = entityNames[0];
      
      if (primaryEntity && this.attributeEntityService) {
        console.log(`[AllAttributesStrategy] Loading attributes for primary entity: ${primaryEntity}`);
        
        this.attributeEntityService.getAttributes(primaryEntity).subscribe(attributes => {
          console.log(`[AllAttributesStrategy] Loaded ${attributes.length} attributes for ${primaryEntity}`);
          
          // We can't use these attributes now as we're in a callback, but they'll be available for next execution
          const attributeMap = new Map<string, AttributeModel>();
          attributes.forEach(attr => {
            if (this.hasLookupCharacteristics(attr.logicalName, attr)) {
              attr.attributeType = 'Lookup';
            }
            attributeMap.set(attr.logicalName, attr);
          });
          
          // Store for future use (though we can't use it right now)
          const newAttributeMaps = { [primaryEntity]: attributeMap };
          console.log('[AllAttributesStrategy] Attributes loaded for future use');
        });
      }
      
      // For now, proceed with the original result
      return result;
    }

    // We need to check if there was an original raw data before normalization
    // This might help us find values for fields that seem to be missing
    const originalData: any = result['__original_data'] || [];
    const hasOriginalData = Array.isArray(originalData) && originalData.length > 0;

    // Get all available attributes from metadata - these are the attributes we'll include
    const metadataAttributes: Map<string, AttributeModel> = new Map<string, AttributeModel>();

    // Process metadata to get the complete list of attributes
    console.log('[AllAttributesStrategy] Processing attribute metadata');

    // Process attributes from the primary entity or specified entities to process
    for (const entityName of entityNames) {
      const entityAttributes = attributeMaps[entityName];
      if (entityAttributes) {
        console.log(`[AllAttributesStrategy] Processing attributes for entity: ${entityName}, found ${entityAttributes.size} attributes`);

        // Add all attributes from metadata to our map
        for (const [attrName, attrModel] of entityAttributes.entries()) {
          // Ensure lookup fields are properly identified
          if (this.hasLookupCharacteristics(attrName, attrModel)) {
            attrModel.attributeType = 'Lookup';
          }
          metadataAttributes.set(attrName, attrModel);
        }
      }
    }

    console.log(`[AllAttributesStrategy] Collected ${metadataAttributes.size} total attributes from metadata`);

    // Create a mapping from metadata field name to raw data field name
    // e.g., 'ownerid' -> '_ownerid_value'
    const fieldNameMapping = new Map<string, string>();

    // Add __entity_url to our header and attribute list (special case)
    processedResult.header['__entity_url'] = result.header['__entity_url'] || {
      displayName: 'Entity URL',
      logicalName: '__entity_url',
      type: 'string'
    };

    // Create header from metadata attributes
    for (const [attrName, attrModel] of metadataAttributes.entries()) {
      processedResult.header[attrName] = {
        displayName: attrModel.displayName || this.formatDisplayName(attrName),
        logicalName: attrName,
        type: attrModel.attributeType || 'string'
      };

      // For lookup fields, map from the metadata name to the raw data name
      if (attrModel.attributeType === 'Lookup' || attrModel.attributeType === 'Owner' || attrModel.attributeType === 'Customer') {
        const rawFieldName = `_${attrName}_value`;
        fieldNameMapping.set(attrName, rawFieldName);
        console.log(`[AllAttributesStrategy] Mapped lookup field ${attrName} to ${rawFieldName}`);
      }
    }

    console.log(`[AllAttributesStrategy] Created header with ${Object.keys(processedResult.header).length} attributes`);

    // Store formatted values for lookup fields to use consistently in both raw and formatted values
    const lookupFormattedValues: Map<string, string> = new Map<string, string>();

    // First pass: capture all formatted values from the original data
    if (hasOriginalData) {
      originalData.forEach((originalDataRow, rowIndex) => {
        if (!originalDataRow) return;
        
        // Look for formatted value annotations in the original data
        Object.keys(originalDataRow).forEach(key => {
          // Check for any formatted value annotations
          if (key.includes('@OData.Community.Display.V1.FormattedValue')) {
            // Extract the base field name from the annotation
            const baseKey = key.split('@')[0];
            const formattedValue = originalDataRow[key];
            
            // For lookup fields, the base name might be in the format _fieldname_value
            if (baseKey.startsWith('_') && baseKey.endsWith('_value')) {
              // Extract the actual field name from the lookup format
              const actualFieldName = baseKey.substring(1, baseKey.length - 6);
              
              // Store both with the actual field name and the lookup field name
              lookupFormattedValues.set(`${rowIndex}_${actualFieldName}`, formattedValue);
              lookupFormattedValues.set(`${rowIndex}_${baseKey}`, formattedValue);
              
              console.log(`[AllAttributesStrategy] First pass: Captured lookup formatted value for row ${rowIndex}, field ${actualFieldName}: ${formattedValue}`);
            } else {
              // Store with the base key
              lookupFormattedValues.set(`${rowIndex}_${baseKey}`, formattedValue);
              
              console.log(`[AllAttributesStrategy] First pass: Captured formatted value for row ${rowIndex}, field ${baseKey}: ${formattedValue}`);
            }
          }
          
          // Also check for lookup field logical name annotations
          if (key.includes('@Microsoft.Dynamics.CRM.lookuplogicalname')) {
            // This indicates that the base field is a lookup field
            const baseKey = key.split('@')[0];
            // Mark this as a lookup field by storing its type
            if (metadataAttributes.has(baseKey)) {
              const attrModel = metadataAttributes.get(baseKey);
              if (attrModel) {
                attrModel.attributeType = 'Lookup';
                metadataAttributes.set(baseKey, attrModel);
                console.log(`[AllAttributesStrategy] Identified lookup field from annotation: ${baseKey}`);
              }
            }
            
            // For lookup fields with underscore format
            if (baseKey.startsWith('_') && baseKey.endsWith('_value')) {
              const actualFieldName = baseKey.substring(1, baseKey.length - 6);
              if (metadataAttributes.has(actualFieldName)) {
                const attrModel = metadataAttributes.get(actualFieldName);
                if (attrModel) {
                  attrModel.attributeType = 'Lookup';
                  attrModel.referencedEntity = originalDataRow[key]; // Store the referenced entity
                  metadataAttributes.set(actualFieldName, attrModel);
                  console.log(`[AllAttributesStrategy] Identified lookup field from annotation: ${actualFieldName} -> ${originalDataRow[key]}`);
                }
              }
            }
          }
        });
      });
    }

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
        const attrModel = metadataAttributes.get(attrName);
        const isLookupField = attrModel?.attributeType === 'Lookup' || 
                              attrModel?.attributeType === 'Owner' || 
                              attrModel?.attributeType === 'Customer';

        // First check if the attribute exists in the normalized data
        if (attrName in originalRow) {
          newRow[attrName] = originalRow[attrName];
        }
        // Check if we need to use a mapped field name for lookups
        else if (isLookupField && fieldNameMapping.has(attrName) && originalDataRow) {
          const rawFieldName = fieldNameMapping.get(attrName);

          // Check if the mapped field exists in the original data
          if (rawFieldName && rawFieldName in originalDataRow) {
            newRow[attrName] = originalDataRow[rawFieldName];
            
            // For lookup fields, also capture formatted value for later use
            const formattedKey = `${rawFieldName}@OData.Community.Display.V1.FormattedValue`;
            if (formattedKey in originalDataRow) {
              const formattedValue = originalDataRow[formattedKey];
              lookupFormattedValues.set(`${i}_${attrName}`, formattedValue);
              lookupFormattedValues.set(`${i}_${rawFieldName}`, formattedValue); // Store with raw field name too
              console.log(`[AllAttributesStrategy] Captured formatted lookup value for ${attrName}: ${formattedValue}`);
            }
            
            console.log(`[AllAttributesStrategy] Found value for ${attrName} using mapped field ${rawFieldName}: ${newRow[attrName]}`);
          } else {
            newRow[attrName] = null;
          }
        }
        // Check if it exists in the original data (for fields like boolean that might be false)
        else if (originalDataRow && attrName in originalDataRow) {
          newRow[attrName] = originalDataRow[attrName];
          
          // Check for formatted value annotation for this field
          const formattedValue = this.extractFormattedLookupValue(originalDataRow, attrName);
          if (formattedValue) {
            lookupFormattedValues.set(`${i}_${attrName}`, formattedValue);
            console.log(`[AllAttributesStrategy] Captured formatted value for ${attrName}: ${formattedValue}`);
          }
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
              console.log(`[AllAttributesStrategy] Found value for ${attrName} in OData field ${odataKey}`);
            }
            
            // Look specifically for formatted value annotation
            const formattedValue = this.extractFormattedLookupValue(originalDataRow, attrName);
            if (formattedValue) {
              lookupFormattedValues.set(`${i}_${attrName}`, formattedValue);
              console.log(`[AllAttributesStrategy] Captured formatted value from OData for ${attrName}: ${formattedValue}`);
            }
          } else {
            // Otherwise set to null
            newRow[attrName] = null;
          }
        } else {
          // Otherwise set to null
          newRow[attrName] = null;
        }

        // Special handling for boolean fields that might be false (which is not null)
        if (newRow[attrName] === false) {
          console.log(`[AllAttributesStrategy] Found false boolean value for ${attrName}`);
        }
      }

      processedResult.rawValues.push(newRow);
    }

    // Process formatted values - only include attributes that are in the metadata
    if (result.formattedValues && result.formattedValues.length > 0) {
      for (let i = 0; i < result.formattedValues.length; i++) {
        const originalRow = result.formattedValues[i];
        const originalDataRow = hasOriginalData && i < originalData.length ? originalData[i] : null;
        const newRow: any = {};

        // Always include __entity_url
        if ('__entity_url' in originalRow) {
          newRow['__entity_url'] = originalRow['__entity_url'];
        }

        // Only include attributes that are in the metadata
        for (const attrName of metadataAttributes.keys()) {
          const attrModel = metadataAttributes.get(attrName);
          const isLookupField = attrModel?.attributeType === 'Lookup' || 
                                attrModel?.attributeType === 'Owner' || 
                                attrModel?.attributeType === 'Customer';

          // Check if we have a stored formatted value for lookups
          if (lookupFormattedValues.has(`${i}_${attrName}`)) {
            newRow[attrName] = lookupFormattedValues.get(`${i}_${attrName}`);
            console.log(`[AllAttributesStrategy] Using stored formatted value for ${attrName}: ${newRow[attrName]}`);
          }
          // First check in normalized data
          else if (attrName in originalRow) {
            newRow[attrName] = originalRow[attrName];
          }
          // Check if we need to use a mapped field name for lookups
          else if (isLookupField && fieldNameMapping.has(attrName) && originalDataRow) {
            const rawFieldName = fieldNameMapping.get(attrName);

            // For formatted values, check for the formatted value annotation
            if (rawFieldName) {
              // Use the enhanced extractFormattedLookupValue method
              const formattedValue = this.extractFormattedLookupValue(originalDataRow, rawFieldName);
              
              if (formattedValue) {
                newRow[attrName] = formattedValue;
                console.log(`[AllAttributesStrategy] Found formatted value for ${attrName} using lookup extraction: ${formattedValue}`);
              } else if (lookupFormattedValues.has(`${i}_${rawFieldName}`)) {
                // Check if we have a stored value under the raw field name
                newRow[attrName] = lookupFormattedValues.get(`${i}_${rawFieldName}`);
                console.log(`[AllAttributesStrategy] Using stored raw field formatted value for ${attrName}: ${newRow[attrName]}`);
              } else {
                // If no formatted value but we have a raw value, use that from raw values
                newRow[attrName] = processedResult.rawValues[i][attrName];
              }
            } else {
              // Use raw value as fallback
              newRow[attrName] = processedResult.rawValues[i][attrName];
            }
          }
          // Check in original data
          else if (originalDataRow) {
            // Use enhanced extraction method
            const formattedValue = this.extractFormattedLookupValue(originalDataRow, attrName);
            
            if (formattedValue) {
              newRow[attrName] = formattedValue;
              console.log(`[AllAttributesStrategy] Found formatted value using extraction: ${formattedValue}`);
            } else if (originalDataRow[attrName] === true) {
              // For boolean values, add formatted text
              newRow[attrName] = 'Yes';
            } else if (originalDataRow[attrName] === false) {
              newRow[attrName] = 'No';
            } else {
              // Fall back to the raw value if no formatted value is found
              newRow[attrName] = processedResult.rawValues[i][attrName];
            }
          } else {
            // Fall back to the raw value if no formatted value is found
            newRow[attrName] = processedResult.rawValues[i][attrName];
          }
          
          // IMPORTANT: Make sure lookup fields that are GUIDs get their formatted values
          if (isLookupField && newRow[attrName] && typeof newRow[attrName] === 'string' && 
              newRow[attrName].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // Try to find a proper formatted value in our lookup map that might be stored
            // under a different key format
            const guid = newRow[attrName];
            let foundFormattedValue = false;
            
            // Look for this GUID in the raw values and check if we have a formatted value for it
            if (processedResult.rawValues[i]) {
              for (const [key, value] of lookupFormattedValues.entries()) {
                // Extract the rowIndex and fieldName from the key "rowIndex_fieldName"
                const keyParts = key.split('_');
                const rowIndexStr = keyParts[0];
                
                // If this is for our current row
                if (rowIndexStr === i.toString()) {
                  // Check if the value in raw data for this field matches our GUID
                  const fieldName = key.substring(rowIndexStr.length + 1);
                  if (processedResult.rawValues[i][fieldName] === guid) {
                    newRow[attrName] = value;
                    foundFormattedValue = true;
                    console.log(`[AllAttributesStrategy] Found formatted value for GUID ${guid} using field ${fieldName}: ${value}`);
                    break;
                  }
                }
              }
            }
            
            // Last attempt - use extractFormattedLookupValue directly on the original data
            if (!foundFormattedValue && originalDataRow) {
              // For lookup fields with underscore format
              const underscoreFieldName = `_${attrName}_value`;
              const formattedValue = this.extractFormattedLookupValue(originalDataRow, underscoreFieldName);
              
              if (formattedValue) {
                newRow[attrName] = formattedValue;
                foundFormattedValue = true;
                console.log(`[AllAttributesStrategy] Found formatted value for GUID using underscore format: ${formattedValue}`);
              }
            }
            
            if (!foundFormattedValue) {
              // If we couldn't find a better value, leave the GUID as is
              console.log(`[AllAttributesStrategy] No formatted value found for GUID ${guid}, using GUID`);
            }
          }
          
          // For lookup fields with 'ID:' prefix in formatted values, clean them up
          if (isLookupField && newRow[attrName] && typeof newRow[attrName] === 'string' && 
              newRow[attrName].startsWith('ID:')) {
            newRow[attrName] = cleanupFormattedLookupValue(newRow[attrName]);
          }
        }

        processedResult.formattedValues.push(newRow);
      }
    }

    console.log('[AllAttributesStrategy] Final header keys:', Object.keys(processedResult.header));
    console.log('[AllAttributesStrategy] Final raw values keys for first row:',
      Object.keys(processedResult.rawValues[0]));
    console.log('[AllAttributesStrategy] Final formatted values keys for first row:',
      processedResult.formattedValues.length > 0 ? Object.keys(processedResult.formattedValues[0]) : 'No formatted values');

    return processedResult;
  }

  // Helper method to format attribute name to display name
  private formatDisplayName(attribute: string): string {
    // Remove common prefixes (e.g. cr1fc_)
    let displayName = attribute.replace(/^[a-z0-9]+_/i, '');

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

  // Additional helper method to check specifically for lookup fields
  private isLookupField(fieldName: string, value: any): boolean {
    // Check field name patterns common for lookups
    if (fieldName.toLowerCase().endsWith('id') || 
        fieldName.toLowerCase().includes('ref') ||
        fieldName.toLowerCase().endsWith('owner') ||
        fieldName.toLowerCase().endsWith('by')) {
      return true;
    }
    
    // Check value format - if it's a GUID, it's likely a lookup
    if (typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Determines if an attribute has characteristics of a lookup field
   * based on its name and metadata
   */
  private hasLookupCharacteristics(attributeName: string, metadata?: AttributeModel): boolean {
    // If metadata specifies the type as Lookup, Owner, or Customer, it's a lookup
    if (metadata && ['Lookup', 'Owner', 'Customer'].includes(metadata.attributeType)) {
      return true;
    }
    
    // Check common naming patterns for lookups
    if (attributeName.toLowerCase().endsWith('id') || 
        attributeName.toLowerCase().includes('ref') ||
        attributeName.toLowerCase().endsWith('owner') ||
        attributeName.toLowerCase().endsWith('by')) {
      return true;
    }
    
    // Check for underscore format in lookup fields
    if (attributeName.startsWith('_') && attributeName.endsWith('_value')) {
      return true;
    }
    
    return false;
  }
  
  private extractFormattedLookupValue(originalDataRow: any, fieldName: string): string | null {
    if (!originalDataRow) return null;
    
    // First try the standard OData formatted value annotation
    const formattedKey = `${fieldName}@OData.Community.Display.V1.FormattedValue`;
    if (formattedKey in originalDataRow) {
      return originalDataRow[formattedKey];
    }
    
    // Try underscore format for lookup fields
    if (!fieldName.startsWith('_') && !fieldName.endsWith('_value')) {
      const lookupKey = `_${fieldName}_value`;
      const lookupFormattedKey = `${lookupKey}@OData.Community.Display.V1.FormattedValue`;
      
      if (lookupFormattedKey in originalDataRow) {
        return originalDataRow[lookupFormattedKey];
      }
    }
    
    return null;
  }
} 