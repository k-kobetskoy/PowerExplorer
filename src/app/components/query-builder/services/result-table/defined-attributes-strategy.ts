import { MatTableRawData, XmlExecutionResult } from '../xml-executor.service';
import { EntityAttributeMap, AttributeEntityService, AttributeMapResult, EntityAttributeData } from '../entity-services/attribute-entity.service';
import { IResultProcessingStrategy } from './i-result-processing-strategy';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { RowData, CellData, getHeaderFromAttributeMetadata } from './all-attributes-strategy';

interface FieldInfo {
  entityName: string;
  attributeLogicalName: string;
  mappedAttributeName?: string;
  isPrimary: boolean;
}


@Injectable()
export class DefinedAttributesStrategy implements IResultProcessingStrategy {

  constructor(private attributeEntityService: AttributeEntityService) { }

  processRawData(
    rawData: any[], 
    entityAttributeMap: EntityAttributeMap,
    primaryEntityName: string, 
    environmentBrowserUrl: string): Observable<MatTableRawData> {

    return this.attributeEntityService.getSpecificAttributes(entityAttributeMap).pipe(
      map(attributeDefenitionsMaps => {        
        return this.processResultsInternal(rawData, entityAttributeMap, attributeDefenitionsMaps, environmentBrowserUrl);
      }),
      catchError(error => {
        console.error('Error processing attributes:', error);
        return of({
          header: {},
          rows: [],
          __original_data: rawData
        });
      })
    );
  }

  processResults(
    result: XmlExecutionResult, 
    entityAttributeMap: EntityAttributeMap,
    attributeMaps?: { [entityLogicalName: string]: Map<string, AttributeModel> }
  ): XmlExecutionResult {
    // This method is for processing within the service chain
    // Just return the result as we'll do the actual processing in processRawData
    return result;
  }

  // Internal method to do the actual processing
  private processResultsInternal(
    rawData: any[], 
    entityAttributeMap: EntityAttributeMap, 
    attributeDefenitionsMaps: AttributeMapResult, 
    environmentBrowserUrl: string): MatTableRawData {
    
    // Extract actual entity aliases used in the data
    const entityAliasMap = this.extractEntityAliasesFromData(rawData, entityAttributeMap);
    
    // Analyze the raw data to find all linked entity fields that might not be in our map
    const allLinkedFields = findAllLinkedEntityFields(rawData, entityAttributeMap);
    
    // Create field mapping with both defined attributes and discovered linked entity fields
    const fieldMapping = createFieldNameMapping(entityAttributeMap, attributeDefenitionsMaps, allLinkedFields, entityAliasMap);
    
    const rowData = convertResultsToRowData(rawData, entityAttributeMap, attributeDefenitionsMaps, environmentBrowserUrl, fieldMapping, entityAliasMap);
    const header = createHeaderFromAttributeDefinitions(attributeDefenitionsMaps, allLinkedFields);

    return {
      header,
      rows: rowData,
      __original_data: rawData
    };
  }

  /**
   * Extracts the actual entity aliases used in the data and maps them to entity logical names
   */
  private extractEntityAliasesFromData(
    rawData: any[], 
    entityAttributeMap: EntityAttributeMap
  ): Map<string, string> {
    // Maps actual entity aliases in data to entity logical names
    const entityAliasMap = new Map<string, string>();
    
    if (!rawData || rawData.length === 0) {
      return entityAliasMap;
    }
    
    // Get all entity logical names from the map
    const entityLogicalNames = Object.keys(entityAttributeMap);
    
    // Look at the first row to find dot notation fields
    const firstRow = rawData[0];
    
    // Extract unique entity aliases from the data
    const entityAliasesInData = new Set<string>();
    Object.keys(firstRow).forEach(key => {
      const baseName = key.split('@')[0];
      if (baseName.includes('.')) {
        const alias = baseName.split('.')[0];
        entityAliasesInData.add(alias);
      }
    });
    
    // For each entity in our attribute map, try to find a matching alias in the data
    entityLogicalNames.forEach(entityName => {
      if (entityAttributeMap[entityName].isPrimaryEntity) {
        return; // Skip primary entity as it doesn't need an alias
      }
      
      // If the entity has an explicit alias in the map, use that
      if (entityAttributeMap[entityName].entityAlias) {
        entityAliasMap.set(entityAttributeMap[entityName].entityAlias!, entityName);
        return;
      }
      
      // Otherwise, try to find a matching alias in the data
      // This handles the case where the entity alias in the data doesn't match the entity logical name
      entityAliasesInData.forEach(alias => {
        // Simple heuristic: if the alias starts with the entity name, it's likely a match
        if (alias.startsWith(entityName)) {
          entityAliasMap.set(alias, entityName);
        }
      });
    });
    
    return entityAliasMap;
  }
} 

/**
 * Analyzes raw data to find all linked entity fields (fields with a dot in the name)
 * but excludes fields that already have aliases defined in the entityAttributeMap
 */
function findAllLinkedEntityFields(
  rawData: any[], 
  entityAttributeMap: EntityAttributeMap
): Set<string> {
  const linkedFields = new Set<string>();
  
  if (!rawData || rawData.length === 0) {
    return linkedFields;
  }
  
  // First, collect all aliases defined in the entityAttributeMap
  const definedAliases = new Set<string>();
  const aliasToFieldMapping = new Map<string, string>();
  
  for (const entityKey in entityAttributeMap) {
    const entity = entityAttributeMap[entityKey];
    
    if (entity.attributeData) {
      entity.attributeData.forEach(attrData => {
        if (attrData.alias) {
          definedAliases.add(attrData.alias);
          if (entity.entityAlias) {
            const dotNotation = `${entity.entityAlias}.${attrData.attributeLogicalName}`;
            aliasToFieldMapping.set(attrData.alias, dotNotation);
          }
        }
      });
    }
  }
  
  // Take the first row as a sample to find all possible linked entity fields
  const sampleRow = rawData[0];
  
  // Find all keys that have a dot, indicating a linked entity field
  Object.keys(sampleRow).forEach(key => {
    const baseName = key.split('@')[0]; // Remove any OData annotations
    if (baseName.includes('.')) {
      // Make sure this field doesn't already have a defined alias
      if (!definedAliases.has(baseName)) {
        linkedFields.add(baseName);
      }
    }
  });
  
  return linkedFields;
}

function convertResultsToRowData(
  rawData: any[], 
  entityAttributeMap: EntityAttributeMap, 
  attributeDefenitionsMaps: AttributeMapResult, 
  environmentBrowserUrl: string,
  fieldMapping: Map<string, FieldInfo>,
  entityAliasMap: Map<string, string> = new Map()
): RowData[] {
  
  if (!rawData || rawData.length === 0) {
    return [];
  }

  const primaryEntity = Object.keys(entityAttributeMap).find(key => entityAttributeMap[key].isPrimaryEntity) || '';

  // Create a mapping from dot notation fields to their aliases
  const dotToAliasMap = new Map<string, string>();
  
  // Process explicit aliases
  for (const entityKey in entityAttributeMap) {
    const entity = entityAttributeMap[entityKey];
    if (entity.attributeData) {
      entity.attributeData.forEach(attrData => {
        if (attrData.alias && attrData.attributeLogicalName) {
          // If the entity has an explicit alias, use that
          if (entity.entityAlias) {
            const dotNotation = `${entity.entityAlias}.${attrData.attributeLogicalName}`;
            dotToAliasMap.set(dotNotation, attrData.alias);
          }
          
          // Also map any aliases found in the data
          entityAliasMap.forEach((mappedEntityName, actualAlias) => {
            if (mappedEntityName === entityKey) {
              const dotNotation = `${actualAlias}.${attrData.attributeLogicalName}`;
              dotToAliasMap.set(dotNotation, attrData.alias);
            }
          });
        }
      });
    }
  }

  return rawData.map((row, rowIndex) => {
    // 1. Extract base names and group fields
    const fieldGroups = new Map<string, { [key: string]: any }>();

    Object.keys(row).forEach(key => {
      // Handle both regular attributes and linked entity attributes (with dots)
      const baseName = key.split('@')[0];
      if (!fieldGroups.has(baseName)) {
        fieldGroups.set(baseName, {});
      }
      fieldGroups.get(baseName)![key] = row[key];
    });

    const attributes = new Map<string, CellData>();
    let dataverseRowLink = '';

    // Process all field groups
    fieldGroups.forEach((fields, baseName) => {
      // Check if this is a dot notation field that has an alias
      const alias = dotToAliasMap.get(baseName);
      
      // If this field has an alias, and we've already processed the alias, skip it
      if (alias && attributes.has(alias)) {
        return;
      }
      
      // Direct lookup in our field mapping
      let fieldInfo = fieldMapping.get(baseName);
      
      // If we have an alias for this field, use the field mapping for the alias instead
      if (alias) {
        const aliasFieldInfo = fieldMapping.get(alias);
        if (aliasFieldInfo) {
          fieldInfo = aliasFieldInfo;
        }
      }
      
      if (!fieldInfo) {
        // Try to handle linked entity fields if direct match wasn't found
        // Extract entity alias and attribute name from dot notation (entity.attribute)
        const dotParts = baseName.split('.');
        if (dotParts.length === 2) {
          const entityAlias = dotParts[0];
          const attributeName = dotParts[1];
          
          // Find the entity logical name from alias if possible
          let entityName = entityAlias;
          if (entityAliasMap.has(entityAlias)) {
            entityName = entityAliasMap.get(entityAlias)!;
          }
          
          // Create a cell data for this linked entity field
          const dto: CellData = {
            attributeLogicalName: attributeName,
            attributeRawValue: fields[baseName] || '',
            entityName: entityName
          };
          
          // Add formatted value if available
          const formattedValueKey = `${baseName}@OData.Community.Display.V1.FormattedValue`;
          if (fields[formattedValueKey] !== undefined) {
            dto.attributeFormattedValue = fields[formattedValueKey];
          }
          
          // Handle lookup links for linked entity fields
          const lookupLogicalNameKey = `${baseName}@Microsoft.Dynamics.CRM.lookuplogicalname`;
          const lookupLogicalName = fields[lookupLogicalNameKey];
          
          if (dto.attributeRawValue && lookupLogicalName) {
            dto.lookupLogicalName = lookupLogicalName;
            dto.link = `${environmentBrowserUrl}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${lookupLogicalName}&id=${dto.attributeRawValue}`;
          }
          
          // Use the alias if it exists, otherwise use the full baseName
          const attributeKey = alias || baseName;
          attributes.set(attributeKey, dto);
        }
        return; // Skip further processing for this field
      }
      
      // Create cell data using the information from our mapping
      const dto: CellData = {
        attributeLogicalName: fieldInfo.attributeLogicalName,
        attributeRawValue: '',
        entityName: fieldInfo.entityName
      };

      if (Object.keys(fields).length > 1) {
        // Set primary entity's ID link
        if (primaryEntity && fieldInfo.entityName === primaryEntity && fields[baseName + 'id']) {
          dataverseRowLink = `${environmentBrowserUrl}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${primaryEntity}&id=${fields[baseName + 'id']}`;
        }

        // Set raw value
        if (fields[baseName] !== undefined) {
          dto.attributeRawValue = fields[baseName];
        }

        // Set formatted value if available
        const formattedValueKey = `${baseName}@OData.Community.Display.V1.FormattedValue`;
        if (fields[formattedValueKey] !== undefined) {
          dto.attributeFormattedValue = fields[formattedValueKey];
        }

        // Handle lookup links
        const lookupLogicalNameKey = `${baseName}@Microsoft.Dynamics.CRM.lookuplogicalname`;
        const lookupLogicalName = fields[lookupLogicalNameKey];

        if (dto.attributeRawValue && lookupLogicalName) {
          dto.lookupLogicalName = lookupLogicalName;
          dto.link = `${environmentBrowserUrl}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${lookupLogicalName}&id=${dto.attributeRawValue}`;
        }
      } else {
        dto.attributeRawValue = fields[baseName];
      }

      // Use the alias if it exists, otherwise use the field's mapped attribute name or logical name
      const attributeKey = alias || fieldInfo.mappedAttributeName || fieldInfo.attributeLogicalName;
      attributes.set(attributeKey, dto);
    });

    return {
      rowIndex,
      attributes,
      rowJson: row,
      dataverseRowLink
    };
  });
}

/**
 * Creates a mapping from all possible raw data field names to their entity/attribute information
 */
function createFieldNameMapping(
  entityAttributeMap: EntityAttributeMap,
  attributeDefenitionsMaps: AttributeMapResult,
  linkedFields: Set<string> = new Set(),
  entityAliasMap: Map<string, string> = new Map()
): Map<string, FieldInfo> {
  const fieldMapping = new Map<string, FieldInfo>();
  
  // Map to keep track of linked entity fields that are aliased
  const aliasedLinkedFields = new Map<string, string>();
  
  // For each entity in our attribute map
  for (const entityKey in entityAttributeMap) {
    const entity = entityAttributeMap[entityKey];
    const entityAttributes = attributeDefenitionsMaps[entityKey];
    
    if (!entityAttributes) {
      continue;
    }
    
    const isPrimary = !!entity.isPrimaryEntity;

    // Process defined attributes for this entity
    if (entity.attributeData && entity.attributeData.length > 0) {
      // Process attributes explicitly defined in the query
      entity.attributeData.forEach(attrData => {
        if (!attrData.attributeLogicalName) return;
        
        const attributeLogicalName = attrData.attributeLogicalName;
        
        // Case 1: If the attribute has an alias, the raw data will use that alias
        if (attrData.alias) {
          fieldMapping.set(attrData.alias, {
            entityName: entityKey,
            attributeLogicalName,
            isPrimary
          });
          
          // If this is a linked entity, map the alias to all possible field name patterns
          if (!isPrimary) {
            // If the entity has an explicit alias, use it
            if (entity.entityAlias) {
              const dotNotation = `${entity.entityAlias}.${attributeLogicalName}`;
              aliasedLinkedFields.set(dotNotation, attrData.alias);
            } 
            
            // Also check for any additional aliases found in the data
            entityAliasMap.forEach((mappedEntityName, actualAlias) => {
              if (mappedEntityName === entityKey) {
                const dotNotation = `${actualAlias}.${attributeLogicalName}`;
                aliasedLinkedFields.set(dotNotation, attrData.alias);
              }
            });
          }
        } 
        // Case 2: For primary entity attributes with no alias, the raw data will use the attribute name directly
        else if (isPrimary) {
          fieldMapping.set(attributeLogicalName, {
            entityName: entityKey,
            attributeLogicalName,
            isPrimary
          });
          
          // For lookup fields on primary entity, also add the special _value syntax
          const attrModel = entityAttributes.get(attributeLogicalName);
          if (attrModel && 
              (attrModel.attributeType === 'Lookup' || 
               attrModel.attributeType === 'Customer' || 
               attrModel.attributeType === 'Owner')) {
            const lookupFieldName = `_${attributeLogicalName}_value`;
            fieldMapping.set(lookupFieldName, {
              entityName: entityKey,
              attributeLogicalName,
              isPrimary
            });
          }
        }
        // Case 3: For linked entity attributes with no alias, but with entity alias
        else if (entity.entityAlias) {
          const fieldName = `${entity.entityAlias}.${attributeLogicalName}`;
          fieldMapping.set(fieldName, {
            entityName: entityKey,
            attributeLogicalName,
            mappedAttributeName: fieldName, // Store the full qualified name for the map
            isPrimary: false
          });
        }
        // Case 4: For linked entity attributes with no alias and no entity alias
        // In this case, we need to check all possible entity aliases for this entity
        else {
          // First, try using the entity logical name directly
          const fieldName = `${entityKey}.${attributeLogicalName}`;
          fieldMapping.set(fieldName, {
            entityName: entityKey,
            attributeLogicalName,
            mappedAttributeName: fieldName,
            isPrimary: false
          });
          
          // Then, check for any aliases found in the data
          entityAliasMap.forEach((mappedEntityName, actualAlias) => {
            if (mappedEntityName === entityKey) {
              const dotNotation = `${actualAlias}.${attributeLogicalName}`;
              fieldMapping.set(dotNotation, {
                entityName: entityKey,
                attributeLogicalName,
                mappedAttributeName: dotNotation,
                isPrimary: false
              });
            }
          });
        }
      });
    }
  }
  
  // Add all discovered linked entity fields that aren't already in the mapping
  // and aren't aliased to another field
  linkedFields.forEach(fieldName => {
    if (!fieldMapping.has(fieldName) && !aliasedLinkedFields.has(fieldName)) {
      const dotParts = fieldName.split('.');
      if (dotParts.length === 2) {
        const entityAlias = dotParts[0];
        const attributeName = dotParts[1];
        
        // Find the entity logical name from the alias if possible
        let entityName = entityAlias; // Default to alias if we can't find the entity
        
        // Check our entity alias map first
        if (entityAliasMap.has(entityAlias)) {
          entityName = entityAliasMap.get(entityAlias)!;
        }
        // Otherwise try to find by matching the name
        else {
          for (const key in entityAttributeMap) {
            if (entityAttributeMap[key].entityAlias === entityAlias) {
              entityName = key;
              break;
            }
          }
        }
        
        fieldMapping.set(fieldName, {
          entityName: entityName,
          attributeLogicalName: attributeName,
          mappedAttributeName: fieldName,
          isPrimary: false
        });
      }
    }
  });
  
  return fieldMapping;
}

function createHeaderFromAttributeDefinitions(
  attributeDefenitionsMaps: AttributeMapResult,
  linkedFields: Set<string> = new Set()
) {
  // Create a header from all entities' attribute definitions
  const header = {};
  
  for (const entityName in attributeDefenitionsMaps) {
    const entityAttributes = attributeDefenitionsMaps[entityName];
    // Convert the Map to an object for the getHeaderFromAttributeMetadata function
    const attributesObj: { [attributeLogicalName: string]: AttributeModel } = {};
    entityAttributes.forEach((value, key) => {
      attributesObj[key] = value;
    });
    
    const entityHeader = getHeaderFromAttributeMetadata(attributesObj);
    
    // Merge headers from all entities
    Object.assign(header, entityHeader);
  }
  
  // Add headers for linked fields that weren't in the attribute definitions
  linkedFields.forEach(fieldName => {
    if (!header[fieldName]) {
      const dotParts = fieldName.split('.');
      if (dotParts.length === 2) {
        const entityAlias = dotParts[0];
        const attributeName = dotParts[1];
        
        header[fieldName] = {
          logicalName: attributeName,
          displayName: `${entityAlias}.${attributeName}`,
          type: 'string' // Default type since we don't have the actual type information
        };
      }
    }
  });
  
  return header;
}

