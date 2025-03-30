import { XmlExecutionResult } from '../xml-executor.service';
import { EntityAttributeMap, AttributeEntityService } from '../entity-services/attribute-entity.service';
import { IResultProcessingStrategy } from './i-result-processing-strategy';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, from, map, catchError, of } from 'rxjs';

/**
 * Enhanced interface for tracking entity-attribute relationships with detailed metadata
 */
interface EntityAttributeMapDetail {
  entityLogicalName: string;
  entityAlias: string | null;
  isPrimaryEntity: boolean;
  attributes: {
    attributeLogicalName: string;
    attributeType: string;
    isLookup: boolean;
    referencedEntity?: string;
    // Add qualifier flag to track if this is a qualified field name
    isFromLinkedEntity: boolean;
  }[];
}

// Add a utility interface to track qualified attribute names
interface QualifiedAttributeKey {
  entityName: string;
  entityAlias: string | null;
  attributeName: string;
  isPrimaryEntity: boolean;
  isFromLinkedEntity: boolean;
  // The full qualified name to use as the key (e.g., entityAlias.attributeName)
  fullQualifiedName: string;
}

/**
 * Strategy for processing results when attributes are explicitly defined in the query.
 * This ensures we include all requested attributes in the result, even if they have no data.
 */
@Injectable()
export class DefinedAttributesStrategy implements IResultProcessingStrategy {
  
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
    
    // Log the detailed entity attribute map for debugging
    console.log('[DefinedAttributesStrategy] Entity Attribute Map details:');
    for (const entityName of Object.keys(entityAttributeMap)) {
      const entityData = entityAttributeMap[entityName];
      console.log(`[DefinedAttributesStrategy]   Entity: ${entityName}`);
      console.log(`[DefinedAttributesStrategy]     Alias: ${entityData.entityAlias || 'none'}`);
      console.log(`[DefinedAttributesStrategy]     Primary: ${entityData.isPrimaryEntity || false}`);
      
      if (entityData.attributeData) {
        if (Array.isArray(entityData.attributeData)) {
          console.log(`[DefinedAttributesStrategy]     Attributes: ${
            entityData.attributeData.map(attr => attr.attributeLogicalName).join(', ')
          }`);
        } else {
          console.log(`[DefinedAttributesStrategy]     Attributes: ${Object.keys(entityData.attributeData).join(', ')}`);
        }
      }
    }
    
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

    // Log detailed entity attribute map for debugging
    console.log('[DefinedAttributesStrategy] Detailed EntityAttributeMap:');
    for (const entityName of Object.keys(entityAttributeMap)) {
      const entityData = entityAttributeMap[entityName];
      console.log(`[DefinedAttributesStrategy] Entity: ${entityName}`);
      console.log(`[DefinedAttributesStrategy]   - Entity Alias: ${entityData.entityAlias || 'none'}`);
      console.log(`[DefinedAttributesStrategy]   - Is Primary Entity: ${entityData.isPrimaryEntity || false}`);
      
      if (entityData.attributeData) {
        if (Array.isArray(entityData.attributeData)) {
          console.log(`[DefinedAttributesStrategy]   - Attributes (${entityData.attributeData.length}): ${
            entityData.attributeData.map(attr => attr.attributeLogicalName).join(', ')
          }`);
        } else {
          const attributeNames = Object.keys(entityData.attributeData);
          console.log(`[DefinedAttributesStrategy]   - Attributes (${attributeNames.length}): ${attributeNames.join(', ')}`);
        }
      } else {
        console.log('[DefinedAttributesStrategy]   - No attribute data defined');
      }
    }

    if (!result || !result.rawValues || result.rawValues.length === 0) {
      console.log('[DefinedAttributesStrategy] No result data to process, returning original result');
      return result;
    }

    // Clone the result to avoid modifying the original
    const processedResult: XmlExecutionResult = {
      header: {}, // Start with an empty header
      rawValues: [],
      formattedValues: []
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
    
    // Build the enhanced entity-attribute relationship map
    const enhancedEntityMap = new Map<string, EntityAttributeMapDetail>();
    
    // First pass: build the basic structure using entityAttributeMap
    for (const entityName of Object.keys(entityAttributeMap)) {
      const entityData = entityAttributeMap[entityName];
      
      const enhancedEntity: EntityAttributeMapDetail = {
        entityLogicalName: entityName,
        entityAlias: entityData.entityAlias || null,
        isPrimaryEntity: entityData.isPrimaryEntity || false,
        attributes: []
      };
      
      // Process attributes
      if (entityData.attributeData) {
        if (Array.isArray(entityData.attributeData)) {
          // New format: array of attribute objects
          entityData.attributeData.forEach(attributeObj => {
            const attrName = attributeObj.attributeLogicalName;
            
            // Get attribute metadata if available
            let attrModel: AttributeModel | undefined;
            if (attributeMaps && attributeMaps[entityName]) {
              attrModel = attributeMaps[entityName].get(attrName);
            }
            
            // Check if this is a lookup field using the new method
            const lookupInfo = this.isLookupField(
              attrName, 
              entityName, 
              entityData.entityAlias || null,
              attrModel, 
              hasOriginalData && originalData.length > 0 ? originalData[0] : undefined
            );
            
            enhancedEntity.attributes.push({
              attributeLogicalName: attrName,
              attributeType: attrModel?.attributeType || 'String',
              isLookup: lookupInfo.isLookup,
              referencedEntity: lookupInfo.referencedEntity,
              isFromLinkedEntity: false
            });
          });
        } else {
          // Old format: object with attribute names as keys
          const attributeNames = Object.keys(entityData.attributeData);
          attributeNames.forEach(attrName => {
            // Get attribute metadata if available
            let attrModel: AttributeModel | undefined;
            if (attributeMaps && attributeMaps[entityName]) {
              attrModel = attributeMaps[entityName].get(attrName);
            }
            
            // Check if this is a lookup field using the new method
            const lookupInfo = this.isLookupField(
              attrName, 
              entityName, 
              entityData.entityAlias || null,
              attrModel, 
              hasOriginalData && originalData.length > 0 ? originalData[0] : undefined
            );
            
            enhancedEntity.attributes.push({
              attributeLogicalName: attrName,
              attributeType: attrModel?.attributeType || 'String',
              isLookup: lookupInfo.isLookup,
              referencedEntity: lookupInfo.referencedEntity,
              isFromLinkedEntity: false
            });
          });
        }
      }
      
      enhancedEntityMap.set(entityName, enhancedEntity);
    }
    
    // Second pass: enhance with data from original data if available
    if (hasOriginalData && originalData.length > 0) {
      const firstOriginalRow = originalData[0];
      
      // Create bidirectional mappings between entity logical names and aliases
      const entityToAliasMap = new Map<string, string>();
      const aliasToEntityMap = new Map<string, string>();
      
      // First populate with known aliases from entityAttributeMap
      for (const [entityName, enhancedEntity] of enhancedEntityMap.entries()) {
        if (enhancedEntity.entityAlias) {
          entityToAliasMap.set(entityName, enhancedEntity.entityAlias);
          aliasToEntityMap.set(enhancedEntity.entityAlias, entityName);
        }
      }
      
      // Extract all potential entity aliases from the data
      const possibleAliases = new Set<string>();
      
      Object.keys(firstOriginalRow).forEach(key => {
        // Only consider keys that don't have @ symbol or extract base part before @
        const basePart = key.includes('@') ? key.split('@')[0] : key;
        const parts = basePart.split('.');
        
        if (parts.length > 1) {
          const alias = parts[0];
          // Filter out potential fake aliases
          if (!alias.startsWith('@') && !alias.includes('@') && !alias.includes('_value')) {
            possibleAliases.add(alias);
          }
        }
      });
      
      // Find entities without aliases and try to map them to discovered aliases
      const unmappedEntities = Array.from(enhancedEntityMap.values())
        .filter(entity => !entity.isPrimaryEntity && !entity.entityAlias)
        .map(entity => entity.entityLogicalName);
      
      const availableAliases = Array.from(possibleAliases)
        .filter(alias => !aliasToEntityMap.has(alias));
      
      // Assign aliases to unmapped entities
      for (let i = 0; i < Math.min(unmappedEntities.length, availableAliases.length); i++) {
        const entityName = unmappedEntities[i];
        const alias = availableAliases[i];
        
        // Update the enhanced entity map
        const enhancedEntity = enhancedEntityMap.get(entityName);
        if (enhancedEntity) {
          enhancedEntity.entityAlias = alias;
          
          // Update bidirectional maps
          entityToAliasMap.set(entityName, alias);
          aliasToEntityMap.set(alias, entityName);
          
          console.log(`[DefinedAttributesStrategy] Inferred alias ${alias} for entity ${entityName} from data`);
        }
      }
      
      // Detect lookup fields and referenced entities from the data
      for (const [entityName, enhancedEntity] of enhancedEntityMap.entries()) {
        const entityAlias = enhancedEntity.entityAlias;
        
        // For each attribute, check for evidence it might be a lookup
        enhancedEntity.attributes.forEach(attr => {
          // If already identified as a lookup, just check for additional metadata
          if (attr.isLookup) {
            // If we don't have a referenced entity yet, try to find it in the data
            if (!attr.referencedEntity) {
              const fieldRepresentations = this.findFieldRepresentations(
                attr.attributeLogicalName, 
                entityAlias, 
                firstOriginalRow
              );
              
              // Look for Microsoft.Dynamics.CRM.lookuplogicalname annotation in any field representation
              for (const fieldKey of fieldRepresentations) {
                if (fieldKey.includes('@Microsoft.Dynamics.CRM.lookuplogicalname')) {
                  attr.referencedEntity = firstOriginalRow[fieldKey];
                  console.log(`[DefinedAttributesStrategy] Found referenced entity for ${attr.attributeLogicalName}: ${attr.referencedEntity}`);
                  break;
                }
              }
            }
            return; // Skip further processing for fields already identified as lookups
          }
          
          // Find all representations of this field in the data
          const fieldRepresentations = this.findFieldRepresentations(
            attr.attributeLogicalName, 
            entityAlias, 
            firstOriginalRow
          );
          
          if (fieldRepresentations.length > 0) {
            let lookupEvidence = false;
            let referencedEntity: string | undefined;
            
            // Check each representation for lookup evidence
            for (const fieldKey of fieldRepresentations) {
              // If the field has a Microsoft.Dynamics.CRM.lookuplogicalname annotation
              if (fieldKey.includes('@Microsoft.Dynamics.CRM.lookuplogicalname')) {
                lookupEvidence = true;
                referencedEntity = firstOriginalRow[fieldKey];
              }
              
              // If the field is in underscore format (_fieldname_value)
              if (this.parseFieldName(fieldKey).isUnderscore) {
                lookupEvidence = true;
              }
              
              // If the field has a formatted value, it might be a lookup
              if (fieldKey.includes('@OData.Community.Display.V1.FormattedValue')) {
                // Check if the base field value (without annotation) is a GUID
                const parsedField = this.parseFieldName(fieldKey);
                const baseFieldKey = parsedField.entityAlias 
                  ? `${parsedField.entityAlias}.${parsedField.baseFieldName}`
                  : parsedField.baseFieldName;
                
                if (baseFieldKey in firstOriginalRow) {
                  const value = firstOriginalRow[baseFieldKey];
                  if (typeof value === 'string' && 
                      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                    lookupEvidence = true;
                  }
                }
              }
            }
            
            // If we found lookup evidence, update the attribute
            if (lookupEvidence) {
              attr.isLookup = true;
              if (referencedEntity) {
                attr.referencedEntity = referencedEntity;
              }
              console.log(`[DefinedAttributesStrategy] Detected lookup field ${attr.attributeLogicalName} in entity ${entityName} from representations in data`);
            }
          }
        });
      }
    }
    
    console.log('[DefinedAttributesStrategy] Built enhanced entity map with', enhancedEntityMap.size, 'entities');
    
    // Log the enhanced entity map for debugging
    for (const [entityName, entity] of enhancedEntityMap.entries()) {
      console.log(`[DefinedAttributesStrategy] Enhanced entity: ${entityName}`);
      console.log(`[DefinedAttributesStrategy]   - Alias: ${entity.entityAlias || 'none'}`);
      console.log(`[DefinedAttributesStrategy]   - Primary: ${entity.isPrimaryEntity}`);
      console.log(`[DefinedAttributesStrategy]   - Attributes: ${entity.attributes.length}`);
      
      // Log lookup fields
      const lookupFields = entity.attributes.filter(attr => attr.isLookup);
      if (lookupFields.length > 0) {
        console.log(`[DefinedAttributesStrategy]   - Lookup fields: ${
          lookupFields.map(attr => 
            `${attr.attributeLogicalName}${attr.referencedEntity ? ` (→ ${attr.referencedEntity})` : ''}`
          ).join(', ')
        }`);
      }
    }
    
    // Create a mapping from metadata field name to raw data field name
    // e.g., 'ownerid' -> '_ownerid_value'
    const fieldNameMapping = new Map<string, string>();
    
    // Get all available attributes from metadata - these are the ONLY attributes we'll include
    const metadataAttributes: Map<string, AttributeModel> = new Map<string, AttributeModel>();
    
    // Map to track which attributes are explicitly defined in the query
    const definedAttributes: Set<string> = new Set<string>();
    
    // Map to track entityName to entityAlias for lookup
    const entityAliasMap: Map<string, string> = new Map<string, string>();
    
    // Map attribute logical names to their entity logical names
    const attributeToEntityMap: Map<string, string> = new Map<string, string>();
    
    // Add a map to track if an attribute is from a linked entity
    const attributeSourceMap: Map<string, QualifiedAttributeKey> = new Map<string, QualifiedAttributeKey>();
    
    // Use the enhanced entity map to populate the working maps needed for processing
    for (const [entityName, enhancedEntity] of enhancedEntityMap.entries()) {
      // Setup entity-alias mapping
      if (enhancedEntity.entityAlias) {
        entityAliasMap.set(entityName, enhancedEntity.entityAlias);
      }
      
      // Process attributes
      enhancedEntity.attributes.forEach(attr => {
        const attrName = attr.attributeLogicalName;
        const isFromLinkedEntity = !!enhancedEntity.entityAlias && !enhancedEntity.isPrimaryEntity;
        
        // Mark the attribute as from a linked entity
        attr.isFromLinkedEntity = isFromLinkedEntity;
        
        // Determine if we need to use a qualified name for this attribute
        // Create a fully qualified attribute name if this is from a linked entity
        let qualifiedAttrName = attrName;
        if (isFromLinkedEntity && enhancedEntity.entityAlias) {
          qualifiedAttrName = `${enhancedEntity.entityAlias}.${attrName}`;
          console.log(`[DefinedAttributesStrategy] Created qualified name ${qualifiedAttrName} for linked entity attribute`);
        }
        
        // Add qualified attribute key to track source information
        const qualifiedKey: QualifiedAttributeKey = {
          entityName: entityName,
          entityAlias: enhancedEntity.entityAlias,
          attributeName: attrName,
          isPrimaryEntity: enhancedEntity.isPrimaryEntity,
          isFromLinkedEntity: isFromLinkedEntity,
          fullQualifiedName: qualifiedAttrName
        };
        
        // Store the qualified attribute key
        attributeSourceMap.set(qualifiedAttrName, qualifiedKey);
        
        // Add to defined attributes
        definedAttributes.add(qualifiedAttrName);
        
        // Map attribute to entity
        attributeToEntityMap.set(qualifiedAttrName, entityName);
        
        // For lookup fields, create field name mapping
        if (attr.isLookup) {
          const underscoreFieldName = `_${attrName}_value`;
          fieldNameMapping.set(qualifiedAttrName, underscoreFieldName);
          console.log(`[DefinedAttributesStrategy] Mapped lookup field ${qualifiedAttrName} to ${underscoreFieldName}`);
        }
        
        // Create or update metadata attribute entry for this attribute
        let metadataAttribute: AttributeModel | undefined;
        
        // First try to get from attributeMaps if available
        if (attributeMaps && attributeMaps[entityName] && attributeMaps[entityName].has(attrName)) {
          metadataAttribute = attributeMaps[entityName].get(attrName);
        }
        
        // If not found, create a placeholder
        if (!metadataAttribute) {
          // Try to determine the most appropriate type
          let attributeType = attr.attributeType || 'String';
          if (attr.isLookup) {
            attributeType = 'Lookup';
          } else if (attrName.toLowerCase().includes('date') || 
                   attrName.toLowerCase().includes('time') || 
                   attrName.endsWith('on')) {
            attributeType = 'DateTime';
          } else if (attrName.toLowerCase().includes('money') || 
                   attrName.toLowerCase().includes('price') || 
                   attrName.toLowerCase().includes('cost')) {
            attributeType = 'Money';
          }
          
          // Create display name (use qualified format for linked entities)
          let displayName = this.formatDisplayName(attrName);
          if (isFromLinkedEntity && enhancedEntity.entityAlias) {
            displayName = `${enhancedEntity.entityAlias}.${displayName}`;
          }
          
          metadataAttribute = {
            logicalName: qualifiedAttrName, // Use the qualified name here
            displayName: displayName,
            attributeType: attributeType
          };
          
          // Add referenced entity if this is a lookup
          if (attr.isLookup && attr.referencedEntity) {
            metadataAttribute.referencedEntity = attr.referencedEntity;
          }
        } else if (attr.isLookup && attr.referencedEntity && !metadataAttribute.referencedEntity) {
          // Add referenced entity to existing metadata if not already present
          metadataAttribute.referencedEntity = attr.referencedEntity;
          
          // Update logical name to qualified name if from linked entity
          if (isFromLinkedEntity && enhancedEntity.entityAlias) {
            metadataAttribute.logicalName = qualifiedAttrName;
            // Update display name too
            metadataAttribute.displayName = `${enhancedEntity.entityAlias}.${metadataAttribute.displayName || this.formatDisplayName(attrName)}`;
          }
        }
        
        // Add to metadata attributes map
        metadataAttributes.set(qualifiedAttrName, metadataAttribute);
      });
    }
    
    console.log(`[DefinedAttributesStrategy] Populated ${metadataAttributes.size} total attributes for processing`);
    
    // A map to store formatted values from linked entity lookup fields
    const linkedLookupFormattedValues: Map<string, string> = new Map<string, string>();

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
      
      console.log(`[DefinedAttributesStrategy] Processing row ${i + 1} - Original data keys:`, originalDataRow ? Object.keys(originalDataRow).length : 'No data');
      
      // Debug: Look specifically for any fields related to linked entities
      if (originalDataRow) {
        const linkRelatedKeys = Object.keys(originalDataRow).filter(key => key.includes('.'));
        if (linkRelatedKeys.length > 0) {
          console.log(`[DefinedAttributesStrategy] Found ${linkRelatedKeys.length} linked entity related fields:`, linkRelatedKeys);
        }
      }
      
      // Only include attributes that are in the metadata
      for (const qualifiedAttrName of metadataAttributes.keys()) {
        const attrMetadata = metadataAttributes.get(qualifiedAttrName);
        const entityName = attributeToEntityMap.get(qualifiedAttrName) || '';
        const enhancedEntity = enhancedEntityMap.get(entityName);
        const entityAlias = enhancedEntity?.entityAlias || null;
        
        // Get source information
        const sourceInfo = attributeSourceMap.get(qualifiedAttrName);
        const isLinkedEntityField = sourceInfo?.isFromLinkedEntity || false;
        const basicAttrName = sourceInfo?.attributeName || qualifiedAttrName;
        
        // Log processing details for this attribute
        console.log(`[DefinedAttributesStrategy] Processing attribute: ${qualifiedAttrName}`, {
          entityName,
          entityAlias,
          isLinkedEntityField,
          basicAttrName
        });
        
        // Determine field type from metadata for specialized processing
        const isLookup = attrMetadata?.attributeType === 'Lookup' || 
                        attrMetadata?.attributeType === 'Owner' ||
                        attrMetadata?.attributeType === 'Customer' ||
                        enhancedEntity?.attributes.find(a => a.attributeLogicalName === basicAttrName)?.isLookup || 
                        false;
        
        // Use specialized processing based on field type and context
        if (isLookup) {
          // Use enhanced lookup field extraction
          const lookupValue = this.extractLookupFieldValue(
            basicAttrName,
            entityName,
            entityAlias,
            originalRow,
            originalDataRow
          );
          
          // Set the raw value
          newRow[qualifiedAttrName] = lookupValue.rawValue;
          
          // Save the formatted value for later use
          if (lookupValue.formattedValue !== undefined) {
            linkedLookupFormattedValues.set(`${i}_${qualifiedAttrName}`, lookupValue.formattedValue);
          }
        } 
        // For linked entity fields (non-lookup)
        else if (isLinkedEntityField) {
          // Use the linked entity field processor
          const linkedValue = this.processLinkedEntityField(
            basicAttrName,
            entityAlias || '',
            originalRow,
            originalDataRow
          );
          
          newRow[qualifiedAttrName] = linkedValue.rawValue;
          
          // Save formatted value if different from raw
          if (linkedValue.formattedValue !== linkedValue.rawValue) {
            linkedLookupFormattedValues.set(`${i}_${qualifiedAttrName}`, linkedValue.formattedValue);
          }
        }
        // For standard fields
        else {
          // Use the standard field processor
          const fieldValue = this.processStandardField(
            basicAttrName,
            entityName,
            entityAlias,
            originalRow,
            originalDataRow,
            newRow
          );
          
          newRow[qualifiedAttrName] = fieldValue.rawValue;
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
        const rawRow = processedResult.rawValues[i] || {};
        
        // Always include __entity_url
        if ('__entity_url' in originalRow) {
          newRow['__entity_url'] = originalRow['__entity_url'];
        }
        
        // Only include attributes that are in the metadata
        for (const qualifiedAttrName of metadataAttributes.keys()) {
          const attrMetadata = metadataAttributes.get(qualifiedAttrName);
          const entityName = attributeToEntityMap.get(qualifiedAttrName) || '';
          const enhancedEntity = enhancedEntityMap.get(entityName);
          const entityAlias = enhancedEntity?.entityAlias || null;
          
          // Get source information
          const sourceInfo = attributeSourceMap.get(qualifiedAttrName);
          const isLinkedEntityField = sourceInfo?.isFromLinkedEntity || false;
          const basicAttrName = sourceInfo?.attributeName || qualifiedAttrName;
          
          // Check if this is a lookup field
          const isLookup = attrMetadata?.attributeType === 'Lookup' || 
                          attrMetadata?.attributeType === 'Owner' ||
                          attrMetadata?.attributeType === 'Customer' ||
                          enhancedEntity?.attributes.find(a => a.attributeLogicalName === basicAttrName)?.isLookup || 
                          false;
          
          if (isLookup) {
            // First check if we have a stored formatted value
            if (linkedLookupFormattedValues.has(`${i}_${qualifiedAttrName}`)) {
              newRow[qualifiedAttrName] = linkedLookupFormattedValues.get(`${i}_${qualifiedAttrName}`);
              console.log(`[DefinedAttributesStrategy] Using stored lookup formatted value for ${qualifiedAttrName}: ${newRow[qualifiedAttrName]}`);
            }
            // If not, try to extract it from the data
            else {
              const lookupValue = this.extractLookupFieldValue(
                basicAttrName,
                entityName,
                entityAlias,
                originalRow,
                originalDataRow
              );
              
              // Use the formatted value if available, otherwise fall back to raw value
              if (lookupValue.formattedValue !== undefined) {
                newRow[qualifiedAttrName] = lookupValue.formattedValue;
              } else if (rawRow[qualifiedAttrName] !== null && rawRow[qualifiedAttrName] !== undefined) {
                // If no formatted value but we have a raw value, use that
                newRow[qualifiedAttrName] = rawRow[qualifiedAttrName];
              } else {
                newRow[qualifiedAttrName] = null;
              }
            }
          }
          // For linked entity fields (non-lookup)
          else if (isLinkedEntityField) {
            // First check if we have a stored formatted value
            if (linkedLookupFormattedValues.has(`${i}_${qualifiedAttrName}`)) {
              newRow[qualifiedAttrName] = linkedLookupFormattedValues.get(`${i}_${qualifiedAttrName}`);
              console.log(`[DefinedAttributesStrategy] Using stored linked entity formatted value for ${qualifiedAttrName}: ${newRow[qualifiedAttrName]}`);
            }
            // Otherwise process it normally
            else {
              const linkedValue = this.processLinkedEntityField(
                basicAttrName,
                entityAlias || '',
                originalRow,
                originalDataRow
              );
              
              // Use formatted value if available, otherwise use raw value
              if (linkedValue.formattedValue !== null) {
                newRow[qualifiedAttrName] = linkedValue.formattedValue;
              } 
              // Fall back to raw value from this row or the raw values row
              else if (linkedValue.rawValue !== null) {
                newRow[qualifiedAttrName] = linkedValue.rawValue;
              }
              else if (rawRow[qualifiedAttrName] !== null && rawRow[qualifiedAttrName] !== undefined) {
                newRow[qualifiedAttrName] = rawRow[qualifiedAttrName];
              }
              else {
                newRow[qualifiedAttrName] = null;
              }
            }
          }
          // For standard fields
          else {
            const fieldValue = this.processStandardField(
              basicAttrName,
              entityName,
              entityAlias,
              originalRow,
              originalDataRow,
              rawRow
            );
            
            // Use formatted value if available
            if (fieldValue.formattedValue !== null) {
              newRow[qualifiedAttrName] = fieldValue.formattedValue;
            }
            // Otherwise use raw value from this row or the raw values row
            else if (fieldValue.rawValue !== null) {
              newRow[qualifiedAttrName] = fieldValue.rawValue;
            }
            else if (rawRow[qualifiedAttrName] !== null && rawRow[qualifiedAttrName] !== undefined) {
              newRow[qualifiedAttrName] = rawRow[qualifiedAttrName];
            }
            else {
              newRow[qualifiedAttrName] = null;
            }
          }
        }
        
        processedResult.formattedValues.push(newRow);
      }
    }
    
    console.log('[DefinedAttributesStrategy] Final header keys:', Object.keys(processedResult.header));
    console.log('[DefinedAttributesStrategy] Final raw values keys for first row:', 
      Object.keys(processedResult.rawValues[0]));
    console.log('[DefinedAttributesStrategy] Final formatted values keys for first row:', 
      processedResult.formattedValues.length > 0 ? Object.keys(processedResult.formattedValues[0]) : 'No formatted values');
      
    // Debug the actual content of the final rows
    console.log('[DefinedAttributesStrategy] === FINAL DATA CONTENT ===');
    for (let i = 0; i < Math.min(processedResult.rawValues.length, 3); i++) {
      console.log(`[DefinedAttributesStrategy] --- Row ${i + 1} Raw Values ---`);
      Object.entries(processedResult.rawValues[i]).forEach(([key, value]) => {
        console.log(`[DefinedAttributesStrategy]   ${key}: ${value}`);
      });
      
      if (processedResult.formattedValues && processedResult.formattedValues.length > i) {
        console.log(`[DefinedAttributesStrategy] --- Row ${i + 1} Formatted Values ---`);
        Object.entries(processedResult.formattedValues[i]).forEach(([key, value]) => {
          console.log(`[DefinedAttributesStrategy]   ${key}: ${value}`);
        });
      }
    }

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
    console.log('[DefinedAttributesStrategy] Processing raw data with integrated method');
    
    if (!rawData || !rawData.rawValues || rawData.rawValues.length === 0 || !this.attributeEntityService) {
      console.log('[DefinedAttributesStrategy] No data to process or attribute service not available');
      return of(rawData);
    }
    
    // For defined attributes, we'll use the getSpecificAttributes method
    // which only loads attributes defined in the entityAttributeMap
    return this.attributeEntityService.getSpecificAttributes(entityAttributeMap).pipe(
      map(attributeMaps => {
        console.log('[DefinedAttributesStrategy] Loaded specific attributes for', 
          Object.keys(attributeMaps).length, 'entities');
        
        // Create minimal result structure with empty arrays
        const rawValues: any[] = [];
        const formattedValues: any[] = [];
        
        // Add entity URL if primary entity is available
        if (primaryEntity) {
          const originalData = rawData.__original_data || [];
          originalData.forEach(item => {
            const rawItem: any = {};
            const formattedItem: any = {};
            
            const entityIdValue = findEntityIdFn(item, primaryEntity);
            if (entityIdValue) {
              addEntityUrlFn(rawItem, formattedItem, primaryEntity, entityIdValue);
            }
            
            rawValues.push(rawItem);
            formattedValues.push(formattedItem);
          });
        } else {
          // Otherwise just create empty objects for each row
          const originalData = rawData.__original_data || [];
          originalData.forEach(() => {
            rawValues.push({});
            formattedValues.push({});
          });
        }
        
        // Create the minimal result structure
        const preparedResult: XmlExecutionResult = {
          header: {},
          rawValues,
          formattedValues,
          __original_data: rawData.__original_data
        };
        
        // Process the result with the attribute maps
        return this.processResults(preparedResult, entityAttributeMap, attributeMaps);
      }),
      catchError(error => {
        console.error('[DefinedAttributesStrategy] Error in processRawData:', error);
        
        // If there's an error loading attributes, return minimal processed data
        // Create minimal result structure with empty arrays
        const rawValues: any[] = [];
        const formattedValues: any[] = [];
        
        // Add entity URL if primary entity is available
        if (primaryEntity && rawData.__original_data) {
          rawData.__original_data.forEach(item => {
            const rawItem: any = {};
            const formattedItem: any = {};
            
            const entityIdValue = findEntityIdFn(item, primaryEntity);
            if (entityIdValue) {
              addEntityUrlFn(rawItem, formattedItem, primaryEntity, entityIdValue);
            }
            
            rawValues.push(rawItem);
            formattedValues.push(formattedItem);
          });
        }
        
        return of({
          header: {},
          rawValues,
          formattedValues,
          __original_data: rawData.__original_data
        });
      })
    );
  }

  /**
   * Determine if a field is a lookup by checking multiple indicators:
   * 1. Metadata type (if available)
   * 2. Field naming patterns (_id, _value suffix)
   * 3. Presence of lookup annotations in the data
   * 4. Entity-specific conventions
   * 
   * @param fieldName The field name to check
   * @param entityName The entity this field belongs to
   * @param entityAlias The alias for this entity (if any)
   * @param metadata The attribute metadata (if available)
   * @param originalData The original data object to check for lookup patterns
   * @returns Object with isLookup flag and referenced entity if found
   */
  private isLookupField(
    fieldName: string, 
    entityName: string,
    entityAlias: string | null,
    metadata?: AttributeModel,
    originalData?: any
  ): { isLookup: boolean, referencedEntity?: string } {
    // Default result
    const result = { 
      isLookup: false, 
      referencedEntity: undefined 
    };
    
    const detectionMethods: {method: string, check: () => boolean}[] = [
      // Method 1: Check metadata
      {
        method: "Metadata type check",
        check: () => {
          if (metadata) {
            if (metadata.attributeType === 'Lookup' || 
                metadata.attributeType === 'Owner' || 
                metadata.attributeType === 'Customer') {
              result.isLookup = true;
              result.referencedEntity = metadata.referencedEntity;
              console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by metadata type: ${metadata.attributeType}`);
              return true;
            }
          }
          return false;
        }
      },
      
      // Method 2: Check field naming conventions
      {
        method: "Field naming conventions",
        check: () => {
          // Common ID patterns
          if (fieldName.toLowerCase().endsWith('id')) {
            result.isLookup = true;
            
            // Try to infer referenced entity from field name
            const possibleEntity = fieldName.substring(0, fieldName.length - 2);
            if (possibleEntity.length > 0) {
              result.referencedEntity = possibleEntity;
            }
            
            console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by 'id' suffix`);
            return true;
          }
          
          // Fields that typically reference users
          if (fieldName.endsWith('by') || fieldName.endsWith('owner')) {
            result.isLookup = true;
            result.referencedEntity = fieldName.endsWith('by') ? 'systemuser' : 'owner';
            console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} as user reference field`);
            return true;
          }
          
          // Explicit reference fields
          if (fieldName.toLowerCase().includes('ref') || 
              fieldName.includes('_lookup') || 
              fieldName.endsWith('_nav')) {
            result.isLookup = true;
            console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by reference keyword`);
            return true;
          }
          
          return false;
        }
      },
      
      // Method 3: Check for lookup patterns in original data
      {
        method: "Data structure and annotations",
        check: () => {
          if (!originalData) return false;
          
          // Get all annotations for this field to check for lookup evidence
          const annotations = this.extractFieldAnnotations(fieldName, entityAlias, originalData);
          
          // Direct lookup logical name annotation is strongest evidence
          if (annotations.has('Microsoft.Dynamics.CRM.lookuplogicalname')) {
            result.isLookup = true;
            result.referencedEntity = annotations.get('Microsoft.Dynamics.CRM.lookuplogicalname');
            console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by lookup logical name annotation, references: ${result.referencedEntity}`);
            return true;
          }
          
          // Check for the underscore pattern which is common for lookups
          const underscoreFieldName = `_${fieldName}_value`;
          if (underscoreFieldName in originalData) {
            result.isLookup = true;
            
            // Also check for lookup logical name annotation on underscore field
            const underscoreAnnotations = this.extractFieldAnnotations(underscoreFieldName, entityAlias, originalData);
            if (underscoreAnnotations.has('Microsoft.Dynamics.CRM.lookuplogicalname')) {
              result.referencedEntity = underscoreAnnotations.get('Microsoft.Dynamics.CRM.lookuplogicalname');
            }
            
            console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by underscore pattern`);
            return true;
          }
          
          // Check for linked entity formats if entity has an alias
          if (entityAlias) {
            const qualifiedFieldKey = `${entityAlias}.${fieldName}`;
            
            // Check for qualified field with lookup annotation
            const qualifiedAnnotations = this.extractFieldAnnotations(qualifiedFieldKey, null, originalData);
            if (qualifiedAnnotations.has('Microsoft.Dynamics.CRM.lookuplogicalname')) {
              result.isLookup = true;
              result.referencedEntity = qualifiedAnnotations.get('Microsoft.Dynamics.CRM.lookuplogicalname');
              console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by qualified lookup logical name annotation`);
              return true;
            }
            
            // Check value pattern - if it's a GUID, it's likely a lookup
            if (qualifiedFieldKey in originalData) {
              const value = originalData[qualifiedFieldKey];
              if (typeof value === 'string' && 
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                result.isLookup = true;
                console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by GUID value pattern`);
                return true;
              }
            }
          }
          
          return false;
        }
      },
      
      // Method 4: Check for entity-specific patterns
      {
        method: "Entity-specific patterns",
        check: () => {
          // Special case for contact entity
          if (entityName === 'contact') {
            // Common contact lookup fields that might not follow standard patterns
            const contactLookups = ['parentcustomerid', 'preferredcontactmethodcode'];
            if (contactLookups.includes(fieldName)) {
              result.isLookup = true;
              console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by contact entity-specific pattern`);
              return true;
            }
          }
          
          // Special case for account entity
          if (entityName === 'account') {
            // Common account lookup fields
            const accountLookups = ['primarycontactid', 'parentaccountid', 'defaultpricelevelid'];
            if (accountLookups.includes(fieldName)) {
              result.isLookup = true;
              console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by account entity-specific pattern`);
              return true;
            }
          }
          
          // Special case for custom entities
          if (entityName.startsWith('cr1fc_')) {
            // Fields ending with 'code' in custom entities are often lookups
            if (fieldName.endsWith('code')) {
              result.isLookup = true;
              console.log(`[DefinedAttributesStrategy] Detected lookup field ${fieldName} by custom entity-specific pattern`);
              return true;
            }
          }
          
          return false;
        }
      }
    ];
    
    // Try each detection method in order
    for (const { method, check } of detectionMethods) {
      if (check()) {
        return result;
      }
    }
    
    // If we've checked all methods and still haven't determined, return default (not a lookup)
    return result;
  }
  
  /**
   * Extract the base field name from a potentially qualified or annotated field
   * Handle patterns like:
   * - entityalias.fieldname
   * - fieldname@annotation
   * - _fieldname_value
   * - entityalias.fieldname@annotation
   * 
   * @param fullFieldName The full field name from the data
   * @returns Object with the parsed field components
   */
  private parseFieldName(fullFieldName: string): {
    baseFieldName: string;
    entityAlias?: string;
    isUnderscore: boolean;
    annotation?: string;
  } {
    const result = {
      baseFieldName: fullFieldName,
      entityAlias: undefined as string | undefined,
      isUnderscore: false,
      annotation: undefined as string | undefined
    };
    
    // First extract any annotations (part after @)
    if (fullFieldName.includes('@')) {
      const parts = fullFieldName.split('@');
      result.baseFieldName = parts[0];
      result.annotation = parts[1];
    }
    
    // Then check for entity alias (part before .)
    if (result.baseFieldName.includes('.')) {
      const parts = result.baseFieldName.split('.');
      result.entityAlias = parts[0];
      result.baseFieldName = parts[1];
    }
    
    // Finally check for underscore pattern (_field_value)
    if (result.baseFieldName.startsWith('_') && result.baseFieldName.endsWith('_value')) {
      result.isUnderscore = true;
      // Extract the actual field name from _fieldname_value
      result.baseFieldName = result.baseFieldName.substring(1, result.baseFieldName.length - 6);
    }
    
    return result;
  }
  
  /**
   * Find all possible representations of a field in the original data
   * This handles various formats like:
   * - Direct: fieldname
   * - Underscore: _fieldname_value
   * - Qualified: entityalias.fieldname
   * - With annotations: fieldname@annotation
   * 
   * @param fieldName The base field name
   * @param entityAlias Optional entity alias for qualified names
   * @param originalData The original data object
   * @returns Array of matching field keys found in the data
   */
  private findFieldRepresentations(
    fieldName: string, 
    entityAlias: string | null, 
    originalData: any
  ): string[] {
    const matchingKeys: string[] = [];
    
    if (!originalData) {
      return matchingKeys;
    }
    
    console.log(`[DefinedAttributesStrategy] Finding field representations for ${fieldName} with alias ${entityAlias || 'none'}`);
    
    // Check if the fieldName already contains a dot (already qualified)
    const isAlreadyQualified = fieldName.includes('.');
    
    let baseFieldName = fieldName;
    let extractedAlias = null;
    
    // If the field is already qualified, extract the base name and alias
    if (isAlreadyQualified) {
      const parts = fieldName.split('.');
      extractedAlias = parts[0];
      baseFieldName = parts[1];
      console.log(`[DefinedAttributesStrategy] Field is already qualified: alias=${extractedAlias}, baseFieldName=${baseFieldName}`);
    }
    
    // Use the provided entity alias if available, otherwise use extracted alias
    const activeAlias = entityAlias || extractedAlias;
    
    // Create an array of possible patterns to look for
    const patterns: string[] = [
      // Direct field name (only if not already qualified)
      ...(isAlreadyQualified ? [] : [fieldName]),
      
      // Underscore format (only if not already qualified)
      ...(isAlreadyQualified ? [] : [`_${fieldName}_value`]),
      
      // Always include the qualified format if we have an alias
      ...(activeAlias ? [
        `${activeAlias}.${baseFieldName}`,
        `${activeAlias}._${baseFieldName}_value`
      ] : [])
    ];
    
    // If the field is already qualified, always include it
    if (isAlreadyQualified && !patterns.includes(fieldName)) {
      patterns.push(fieldName);
    }
    
    console.log(`[DefinedAttributesStrategy] Looking for patterns:`, patterns);
    
    // Look for all keys in the original data that match our patterns
    // or start with our patterns (for keys with annotations)
    for (const key of Object.keys(originalData)) {
      // For direct matches
      if (patterns.includes(key)) {
        matchingKeys.push(key);
        console.log(`[DefinedAttributesStrategy] Found direct match: ${key}`);
        continue;
      }
      
      // For keys with annotations (key@annotation)
      const parsedKey = this.parseFieldName(key);
      if (patterns.includes(parsedKey.baseFieldName)) {
        matchingKeys.push(key);
        console.log(`[DefinedAttributesStrategy] Found match with annotation: ${key} (base=${parsedKey.baseFieldName})`);
        continue;
      }
      
      // Handle already qualified keys with different annotation structures
      if (isAlreadyQualified) {
        // Check if this key starts with our field name and has an annotation
        if (key.startsWith(`${fieldName}@`)) {
          matchingKeys.push(key);
          console.log(`[DefinedAttributesStrategy] Found qualified match with annotation: ${key}`);
          continue;
        }
      }
      
      // Special case for cr1fc_linktable1 - check with or without cr1fc_ prefix
      if (activeAlias && activeAlias === 'cr1fc_linktable1') {
        // With cr1fc_ prefix
        if (key === `${activeAlias}.cr1fc_${baseFieldName}` || 
            key.startsWith(`${activeAlias}.cr1fc_${baseFieldName}@`)) {
          matchingKeys.push(key);
          console.log(`[DefinedAttributesStrategy] Found special cr1fc_linktable1 match with prefix: ${key}`);
          continue;
        }
        
        // Without prefix but field might have it
        if (baseFieldName.startsWith('cr1fc_') && 
            (key === `${activeAlias}.${baseFieldName.substring(6)}` || 
             key.startsWith(`${activeAlias}.${baseFieldName.substring(6)}@`))) {
          matchingKeys.push(key);
          console.log(`[DefinedAttributesStrategy] Found special cr1fc_linktable1 match without prefix: ${key}`);
          continue;
        }
      }
    }
    
    console.log(`[DefinedAttributesStrategy] Found ${matchingKeys.length} field representations for ${fieldName}`);
    return matchingKeys;
  }

  /**
   * Process standard (non-lookup) field to extract both raw and formatted values
   * @param attrName The attribute logical name
   * @param entityName The entity logical name
   * @param entityAlias The entity alias (if any)
   * @param originalRow Normalized row data
   * @param originalDataRow Original data row with all annotations
   * @param rawRow Current raw values row being built
   * @returns Object with raw and formatted values
   */
  private processStandardField(
    attrName: string,
    entityName: string,
    entityAlias: string | null,
    originalRow: any,
    originalDataRow: any,
    rawRow: any = {}
  ): { rawValue: any, formattedValue: any } {
    const result = {
      rawValue: null,
      formattedValue: null
    };
    
    // Processing priority:
    // 1. Direct match in normalized data
    // 2. Direct match in original data
    // 3. Qualified match with entity alias
    // 4. Fallback to null
    
    console.log(`[DefinedAttributesStrategy] Processing standard field ${attrName} for entity ${entityName}`);
    
    // Check if already in normalized data
    if (attrName in originalRow) {
      result.rawValue = originalRow[attrName];
      
      // For formatted value, first try the normalized formatted values
      if (originalRow[`${attrName}@formatted`]) {
        result.formattedValue = originalRow[`${attrName}@formatted`];
      } else {
        result.formattedValue = result.rawValue;
      }
      
      console.log(`[DefinedAttributesStrategy] Found standard field ${attrName} in normalized data: ${result.rawValue}`);
      return result;
    }
    
    // If we don't have original data, can't do more
    if (!originalDataRow) {
      return result;
    }
    
    // Find all annotations for this field
    const annotations = this.extractFieldAnnotations(attrName, entityAlias, originalDataRow);
    
    // Direct match in original data
    if (attrName in originalDataRow) {
      result.rawValue = originalDataRow[attrName];
      console.log(`[DefinedAttributesStrategy] Found standard field ${attrName} in original data: ${result.rawValue}`);
      
      // Check for formatted value
      if (annotations.has('OData.Community.Display.V1.FormattedValue')) {
        result.formattedValue = annotations.get('OData.Community.Display.V1.FormattedValue');
      } else {
        result.formattedValue = result.rawValue;
      }
      
      return result;
    }
    
    // Try with entity alias if available
    if (entityAlias) {
      const qualifiedName = `${entityAlias}.${attrName}`;
      if (qualifiedName in originalDataRow) {
        result.rawValue = originalDataRow[qualifiedName];
        console.log(`[DefinedAttributesStrategy] Found standard field ${attrName} using qualified name ${qualifiedName}: ${result.rawValue}`);
        
        // Check for qualified formatted value
        const qualifiedAnnotations = this.extractFieldAnnotations(qualifiedName, null, originalDataRow);
        if (qualifiedAnnotations.has('OData.Community.Display.V1.FormattedValue')) {
          result.formattedValue = qualifiedAnnotations.get('OData.Community.Display.V1.FormattedValue');
        } else {
          result.formattedValue = result.rawValue;
        }
        
        return result;
      }
    }
    
    // For boolean fields, check if there's a true/false value that becomes Yes/No
    if (rawRow && typeof rawRow[attrName] === 'boolean') {
      result.rawValue = rawRow[attrName];
      result.formattedValue = rawRow[attrName] === true ? 'Yes' : 'No';
      console.log(`[DefinedAttributesStrategy] Using boolean value for ${attrName}: ${result.rawValue} (${result.formattedValue})`);
      return result;
    }
    
    console.log(`[DefinedAttributesStrategy] No value found for standard field ${attrName}`);
    return result;
  }

  /**
   * Extract all OData and Microsoft Dynamics annotations for a field
   * @param fieldName Base field name or qualified field name
   * @param entityAlias Optional entity alias to try with field name
   * @param originalData Original data object with annotations
   * @returns Map of annotation type to annotation value
   */
  private extractFieldAnnotations(
    fieldName: string,
    entityAlias: string | null,
    originalData: any
  ): Map<string, any> {
    const annotations = new Map<string, any>();
    
    if (!originalData) {
      return annotations;
    }
    
    // Process direct field annotations
    Object.keys(originalData).forEach(key => {
      // Check if this key is an annotation for our field
      if (key.startsWith(`${fieldName}@`)) {
        const annotationParts = key.split('@');
        if (annotationParts.length >= 2) {
          const annotationType = annotationParts[1];
          annotations.set(annotationType, originalData[key]);
        }
      }
    });
    
    // If we have an entity alias, also check for qualified annotations
    if (entityAlias && !fieldName.includes('.')) {
      const qualifiedName = `${entityAlias}.${fieldName}`;
      Object.keys(originalData).forEach(key => {
        if (key.startsWith(`${qualifiedName}@`)) {
          const annotationParts = key.split('@');
          if (annotationParts.length >= 2) {
            const annotationType = annotationParts[1];
            annotations.set(annotationType, originalData[key]);
          }
        }
      });
    }
    
    // Also check for underscore format
    const underscoreFieldName = `_${fieldName.replace(/\..+$/, '')}_value`;
    Object.keys(originalData).forEach(key => {
      if (key.startsWith(`${underscoreFieldName}@`)) {
        const annotationParts = key.split('@');
        if (annotationParts.length >= 2) {
          const annotationType = annotationParts[1];
          annotations.set(annotationType, originalData[key]);
        }
      }
    });
    
    // If entity alias is provided, also check underscore format with alias
    if (entityAlias && !fieldName.includes('.')) {
      const qualifiedUnderscoreName = `${entityAlias}._${fieldName}_value`;
      Object.keys(originalData).forEach(key => {
        if (key.startsWith(`${qualifiedUnderscoreName}@`)) {
          const annotationParts = key.split('@');
          if (annotationParts.length >= 2) {
            const annotationType = annotationParts[1];
            annotations.set(annotationType, originalData[key]);
          }
        }
      });
    }
    
    return annotations;
  }

  /**
   * Process a linked entity field by handling the entity alias and field name separately
   * @param fieldName The attribute logical name
   * @param entityAlias The entity alias
   * @param originalRow Normalized row data
   * @param originalDataRow Original data row with all annotations
   * @returns Object with raw and formatted values
   */
  private processLinkedEntityField(
    fieldName: string,
    entityAlias: string,
    originalRow: any,
    originalDataRow: any
  ): { rawValue: any, formattedValue: any } {
    const result = {
      rawValue: null,
      formattedValue: null
    };
    
    if (!originalDataRow) {
      return result;
    }
    
    console.log(`[DefinedAttributesStrategy] Processing linked entity field ${fieldName} with alias ${entityAlias}`);
    
    // For linked entities, look for fields in these formats:
    // 1. entityalias.fieldname
    // 2. entityalias.fieldname@OData.Community.Display.V1.FormattedValue
    const qualifiedName = `${entityAlias}.${fieldName}`;
    
    // Check if the qualified field exists in original data
    if (qualifiedName in originalDataRow) {
      result.rawValue = originalDataRow[qualifiedName];
      console.log(`[DefinedAttributesStrategy] Found linked entity field using ${qualifiedName}: ${result.rawValue}`);
      
      // Check for formatted value
      const formattedValueKey = `${qualifiedName}@OData.Community.Display.V1.FormattedValue`;
      if (formattedValueKey in originalDataRow) {
        result.formattedValue = originalDataRow[formattedValueKey];
      } else {
        result.formattedValue = result.rawValue;
      }
      
      return result;
    }
    
    // Try alternative formats - with cr1fc_ prefix if appropriate
    if (entityAlias.includes('cr1fc_')) {
      // Try adding prefix to field name if not present
      if (!fieldName.startsWith('cr1fc_')) {
        const prefixedQualifiedName = `${entityAlias}.cr1fc_${fieldName}`;
        if (prefixedQualifiedName in originalDataRow) {
          result.rawValue = originalDataRow[prefixedQualifiedName];
          console.log(`[DefinedAttributesStrategy] Found linked entity field using prefixed name ${prefixedQualifiedName}: ${result.rawValue}`);
          
          // Check for formatted value
          const formattedValueKey = `${prefixedQualifiedName}@OData.Community.Display.V1.FormattedValue`;
          if (formattedValueKey in originalDataRow) {
            result.formattedValue = originalDataRow[formattedValueKey];
          } else {
            result.formattedValue = result.rawValue;
          }
          
          return result;
        }
      }
      
      // Try removing prefix from field name if present
      if (fieldName.startsWith('cr1fc_')) {
        const unprefixedQualifiedName = `${entityAlias}.${fieldName.substring(6)}`;
        if (unprefixedQualifiedName in originalDataRow) {
          result.rawValue = originalDataRow[unprefixedQualifiedName];
          console.log(`[DefinedAttributesStrategy] Found linked entity field using unprefixed name ${unprefixedQualifiedName}: ${result.rawValue}`);
          
          // Check for formatted value
          const formattedValueKey = `${unprefixedQualifiedName}@OData.Community.Display.V1.FormattedValue`;
          if (formattedValueKey in originalDataRow) {
            result.formattedValue = originalDataRow[formattedValueKey];
          } else {
            result.formattedValue = result.rawValue;
          }
          
          return result;
        }
      }
    }
    
    console.log(`[DefinedAttributesStrategy] No value found for linked entity field ${fieldName} with alias ${entityAlias}`);
    return result;
  }

  /**
   * Extract value for a lookup field, considering all possible formats
   * This method is enhanced with better logging and more comprehensive format handling
   * 
   * @param attrName The logical name of the attribute
   * @param entityName The entity this attribute belongs to
   * @param entityAlias The alias for this entity (if any)
   * @param originalRow The normalized row data
   * @param originalDataRow The original data row
   * @returns Object containing the raw value and formatted value if available
   */
  private extractLookupFieldValue(
    attrName: string,
    entityName: string,
    entityAlias: string | null,
    originalRow: any,
    originalDataRow: any
  ): { rawValue: any, formattedValue?: any } {
    const result = {
      rawValue: null,
      formattedValue: undefined
    };
    
    console.log(`[DefinedAttributesStrategy] Extracting lookup field value for ${attrName} in entity ${entityName}`);
    
    // Check if already exists in normalized data
    if (attrName in originalRow) {
      result.rawValue = originalRow[attrName];
      console.log(`[DefinedAttributesStrategy] Found lookup field ${attrName} in normalized data: ${result.rawValue}`);
      
      // If we have a value and original data, try to find the formatted value
      if (result.rawValue && originalDataRow) {
        // Try to find formatted value using direct format
        const formattedKey = `${attrName}@OData.Community.Display.V1.FormattedValue`;
        if (formattedKey in originalDataRow) {
          result.formattedValue = originalDataRow[formattedKey];
          console.log(`[DefinedAttributesStrategy] Found formatted value for ${attrName} using key ${formattedKey}: ${result.formattedValue}`);
        }
      }
      
      return result;
    }
    
    // If no original data, we can't do much
    if (!originalDataRow) {
      console.log(`[DefinedAttributesStrategy] No original data available for lookup field ${attrName}`);
      return result;
    }
    
    // Get all possible representations of this field in the data using the enhanced method
    const fieldRepresentations = this.findFieldRepresentations(
      attrName,
      entityAlias,
      originalDataRow
    );
    
    if (fieldRepresentations.length === 0) {
      console.log(`[DefinedAttributesStrategy] No representations found for lookup field ${attrName}`);
      return result;
    }
    
    console.log(`[DefinedAttributesStrategy] Found ${fieldRepresentations.length} representations for lookup field ${attrName}:`);
    fieldRepresentations.forEach(rep => console.log(`  - ${rep}`));
    
    // Enhanced prioritization for lookup field mappings
    // First, get all annotations for metadata-driven decisions
    const annotations = this.extractFieldAnnotations(attrName, entityAlias, originalDataRow);
    
    // Check for lookup logical name annotation which confirms this is a lookup
    let referencedEntity: string | undefined;
    if (annotations.has('Microsoft.Dynamics.CRM.lookuplogicalname')) {
      referencedEntity = annotations.get('Microsoft.Dynamics.CRM.lookuplogicalname');
      console.log(`[DefinedAttributesStrategy] Confirmed lookup field ${attrName} references entity: ${referencedEntity}`);
    }
    
    // Prioritize finding the raw value first (without annotations)
    let rawValueKey: string | undefined;
    let formattedValueKey: string | undefined;
    
    // Process in priority order
    const processes: Array<{description: string, keyFinder: () => string | undefined}> = [
      {
        description: "Standard underscore format with entity alias",
        keyFinder: () => {
          if (entityAlias) {
            const key = `${entityAlias}._${attrName}_value`;
            return key in originalDataRow ? key : undefined;
          }
          return undefined;
        }
      },
      {
        description: "Standard underscore format without alias",
        keyFinder: () => {
          const key = `_${attrName}_value`;
          return key in originalDataRow ? key : undefined;
        }
      },
      {
        description: "Direct field name with entity alias",
        keyFinder: () => {
          if (entityAlias) {
            const key = `${entityAlias}.${attrName}`;
            return key in originalDataRow ? key : undefined;
          }
          return undefined;
        }
      },
      {
        description: "Direct field name without alias",
        keyFinder: () => {
          return attrName in originalDataRow ? attrName : undefined;
        }
      },
      {
        description: "Special case for cr1fc_linktable entities with prefixed field",
        keyFinder: () => {
          if (entityAlias && entityAlias.includes('cr1fc_linktable') && !attrName.startsWith('cr1fc_')) {
            const key = `${entityAlias}.cr1fc_${attrName}`;
            return key in originalDataRow ? key : undefined;
          }
          return undefined;
        }
      },
      {
        description: "Special case for cr1fc_linktable entities with unprefixed field",
        keyFinder: () => {
          if (entityAlias && entityAlias.includes('cr1fc_linktable') && attrName.startsWith('cr1fc_')) {
            const key = `${entityAlias}.${attrName.substring(6)}`;
            return key in originalDataRow ? key : undefined;
          }
          return undefined;
        }
      }
    ];
    
    // Try each method in order until we find a match
    for (const process of processes) {
      const key = process.keyFinder();
      if (key) {
        rawValueKey = key;
        console.log(`[DefinedAttributesStrategy] Found lookup field ${attrName} using ${process.description}: ${rawValueKey}`);
        break;
      }
    }
    
    // If we still don't have a raw value key, try all other field representations from earlier search
    if (!rawValueKey && fieldRepresentations.length > 0) {
      for (const key of fieldRepresentations) {
        // Skip keys with annotations for raw values
        if (key.includes('@')) continue;
        
        rawValueKey = key;
        console.log(`[DefinedAttributesStrategy] Found raw value using field representation: ${rawValueKey}`);
        break;
      }
    }
    
    // If we found a raw value key, extract the value
    if (rawValueKey) {
      result.rawValue = originalDataRow[rawValueKey];
      console.log(`[DefinedAttributesStrategy] Raw value for ${attrName} using key ${rawValueKey}: ${result.rawValue}`);
      
      // Now find formatted value - try direct annotation on the raw value key first
      formattedValueKey = `${rawValueKey}@OData.Community.Display.V1.FormattedValue`;
      if (formattedValueKey in originalDataRow) {
        result.formattedValue = originalDataRow[formattedValueKey];
        console.log(`[DefinedAttributesStrategy] Found formatted value using direct annotation: ${formattedValueKey}`);
      } 
      // Then try other common patterns for formatted values
      else {
        // Try the standard pattern with the base field name
        const parsedRawKey = this.parseFieldName(rawValueKey);
        
        // First try with entity alias if available
        if (parsedRawKey.entityAlias) {
          // Try qualified format with the raw field name
          formattedValueKey = `${parsedRawKey.entityAlias}.${parsedRawKey.baseFieldName}@OData.Community.Display.V1.FormattedValue`;
          
          if (formattedValueKey in originalDataRow) {
            result.formattedValue = originalDataRow[formattedValueKey];
            console.log(`[DefinedAttributesStrategy] Found formatted value using qualified base field: ${formattedValueKey}`);
          }
          else {
            // Try underscore format with entity alias
            formattedValueKey = `${parsedRawKey.entityAlias}._${parsedRawKey.baseFieldName}_value@OData.Community.Display.V1.FormattedValue`;
            
            if (formattedValueKey in originalDataRow) {
              result.formattedValue = originalDataRow[formattedValueKey];
              console.log(`[DefinedAttributesStrategy] Found formatted value using qualified underscore: ${formattedValueKey}`);
            }
          }
        } 
        
        // If we still don't have a formatted value, try without entity alias
        if (result.formattedValue === undefined) {
          // Try direct format
          formattedValueKey = `${attrName}@OData.Community.Display.V1.FormattedValue`;
          
          if (formattedValueKey in originalDataRow) {
            result.formattedValue = originalDataRow[formattedValueKey];
            console.log(`[DefinedAttributesStrategy] Found formatted value using direct attribute name: ${formattedValueKey}`);
          }
          else {
            // Try underscore format
            formattedValueKey = `_${attrName}_value@OData.Community.Display.V1.FormattedValue`;
            
            if (formattedValueKey in originalDataRow) {
              result.formattedValue = originalDataRow[formattedValueKey];
              console.log(`[DefinedAttributesStrategy] Found formatted value using underscore attribute name: ${formattedValueKey}`);
            }
          }
        }
      }
    }
    
    return result;
  }
} 