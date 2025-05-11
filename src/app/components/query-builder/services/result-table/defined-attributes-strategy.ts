import { HeaderMetadata, MatTableRawData, XmlExecutionResult } from '../xml-executor.service';
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

    const linkedEntityMapping = findAllUnaliasedLinkedEntities(rawData, entityAttributeMap);

    const fieldMapping = createFieldNameMapping(entityAttributeMap, attributeDefenitionsMaps, linkedEntityMapping);

    const rowData = convertResultsToRowData(rawData, entityAttributeMap, attributeDefenitionsMaps, environmentBrowserUrl, fieldMapping);

    const header = createHeaderFromAttributeDefinitions(attributeDefenitionsMaps, rowData, entityAttributeMap);

    return {
      header,
      rows: rowData,
      __original_data: rawData
    };
  }
}

function findAllUnaliasedLinkedEntities(rawData: any[], entityAttributeMap: EntityAttributeMap): Map<string, string> {
  const rawEntityNames: Set<string> = new Set();

  const linkedEntitiesWithoutAliases = new Set<string>();
  Object.keys(entityAttributeMap).forEach(entityKey => {
    const entity = entityAttributeMap[entityKey];
    if (!entity.isPrimaryEntity && entity.entityAlias === null) {
      linkedEntitiesWithoutAliases.add(entityKey);
    }
  });


  if (!rawData || rawData.length === 0) {
    return new Map<string, string>();
  }

  const sampleRow = rawData[0];
  Object.keys(sampleRow).forEach(key => {
    const baseName = key.split('@')[0];
    if (baseName.includes('.')) {
      const rawEntityName = baseName.split('.')[0];
      rawEntityNames.add(rawEntityName);
    }
  });

  const entityNameToRawMap = new Map<string, string>();

  linkedEntitiesWithoutAliases.forEach(logicalEntityName => {
    const rawEntityName = Array.from(rawEntityNames).find(x => x.includes(logicalEntityName));
    if (rawEntityName && rawEntityName.substring(logicalEntityName.length).match(/^\d{1,2}$/)) {
      entityNameToRawMap.set(logicalEntityName, rawEntityName);
    }
  });

  return entityNameToRawMap;
}

function convertResultsToRowData(
  rawData: any[],
  entityAttributeMap: EntityAttributeMap,
  attributeDefenitionsMaps: AttributeMapResult,
  environmentBrowserUrl: string,
  fieldMapping: Map<string, FieldInfo>
): RowData[] {

  if (!rawData || rawData.length === 0) {
    return [];
  }

  const primaryEntity = Object.keys(entityAttributeMap).find(key => entityAttributeMap[key].isPrimaryEntity) || '';

  return rawData.map((row, rowIndex) => {
    const fieldGroups = new Map<string, { [key: string]: any }>();

    Object.keys(row).forEach(key => {
      const baseName = key.split('@')[0];

      if (!fieldGroups.has(baseName)) {
        fieldGroups.set(baseName, {});
      }
      fieldGroups.get(baseName)![key] = row[key];

    });

    const primaryEntityId = row[`${primaryEntity}id`];

    const attributes = new Map<string, CellData>();
    let dataverseRowLink = `${environmentBrowserUrl}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${primaryEntity}&id=${primaryEntityId}`;

    const primaryEntityIdAttribute = entityAttributeMap[primaryEntity].attributeData.find(attr => attr.attributeLogicalName === `${primaryEntity}id`);

    if (!primaryEntityIdAttribute) {
      fieldGroups.delete(`${primaryEntity}id`);
    }

    let fieldMappingCopy = new Map<string, FieldInfo>(fieldMapping);

    // Process all field groups
    fieldGroups.forEach((fields, baseName) => {

      if (!fieldMapping.get(baseName)) {
        return;
      }
      // Create cell data using the information from our mapping
      const dto: CellData = {
        attributeLogicalName: fieldMapping.get(baseName)?.attributeLogicalName,
        attributeRawValue: '',
        entityName: fieldMapping.get(baseName)?.entityName
      };

      if (Object.keys(fields).length > 1) {
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

      const attributeKey = baseName;
      if (attributeKey.length > 0) {
        attributes.set(attributeKey, dto);
        fieldMappingCopy.delete(attributeKey);
      }
    });

    fieldMappingCopy.forEach((value, key) => {
      attributes.set(key, {
        attributeLogicalName: value.attributeLogicalName,
        attributeRawValue: '',
        entityName: value.entityName
      });
    });

    return {
      rowIndex,
      attributes,
      rowJson: row,
      dataverseRowLink
    };
  });
}

function createFieldNameMapping(
  entityAttributeMap: EntityAttributeMap,
  attributeDefenitionsMaps: AttributeMapResult,
  linkedEntityMapping: Map<string, string>): Map<string, FieldInfo> {
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
          }
        }
        // Case 2: For primary entity attributes with no alias, the raw data will use the attribute name directly
        else if (isPrimary) {
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
          else {
            fieldMapping.set(attributeLogicalName, {
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
          const fieldName = `${linkedEntityMapping.get(entityKey)}.${attributeLogicalName}`;
          fieldMapping.set(fieldName, {
            entityName: entityKey,
            attributeLogicalName,
            mappedAttributeName: fieldName,
            isPrimary: false
          });
        }
      });
    }
  }
  return fieldMapping;
}

function createHeaderFromAttributeDefinitions(
  attributeDefenitionsMaps: AttributeMapResult,
  rowData: RowData[],
  entityAttributeMap: EntityAttributeMap
): { [key: string]: HeaderMetadata } {
  // Create a header from all entities' attribute definitions
  const header = {};

  rowData.forEach(row => {
    row.attributes.forEach((cell, key) => {
      const type = attributeDefenitionsMaps[cell.entityName]?.get(cell.attributeLogicalName)?.attributeType;
      const logicalName = entityAttributeMap[cell.entityName]?.attributeData.find(attr => attr.attributeLogicalName === cell.attributeLogicalName)?.alias || key;
      const displayName = getDisplayName(cell, entityAttributeMap, attributeDefenitionsMaps);
      header[key] = {
        logicalName: logicalName,
        displayName: displayName,
        type: type
      };
    });
  });

  return header;
}

function getDisplayName(cell: CellData, entityAttributeMap: EntityAttributeMap, attributeDefenitionsMaps: AttributeMapResult): string {
  const entityAttributeData = entityAttributeMap[cell.entityName];

  if (!entityAttributeData) {
    return `${cell.entityName}.${cell.attributeLogicalName}`;
  }

  const attributeAlias = entityAttributeData.attributeData.find(attr => attr.attributeLogicalName === cell.attributeLogicalName)?.alias;
  if (attributeAlias !== null) {
    return attributeAlias;
  }

  if (entityAttributeData.isPrimaryEntity) {
    return attributeDefenitionsMaps[cell.entityName]?.get(cell.attributeLogicalName)?.displayName || cell.attributeLogicalName;
  }

  return `${cell.entityName}.${cell.attributeLogicalName}`;
}
