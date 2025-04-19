import { HeaderMetadata, MatTableRawData } from '../xml-executor.service';
import { AttributeEntityService, EntityAttributeMap } from '../entity-services/attribute-entity.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, from, map, tap, catchError, of } from 'rxjs';
import { IResultProcessingStrategy } from './i-result-processing-strategy';

export interface CellData {
  attributeLogicalName: string;
  attributeRawValue: string;
  attributeFormattedValue?: string;
  lookupLogicalName?: string;
  entityName?: string;
  link?: string;
}

export interface RowData {
  rowIndex: number;
  attributes: Map<string, CellData>;
  rowJson: any;
  dataverseRowLink: string;
}

export function processOriginalDataToRowData(originalData: any[], primaryEntityName: string, environmentBrowserUrl: string): RowData[] {
  if (!originalData || originalData.length === 0) {
    return [];
  }

  try {
    const rows = originalData.map((row, rowIndex) => {
      const fieldGroups = new Map<string, { [key: string]: any }>();

      // First loop - group fields by base name
      Object.keys(row).forEach(key => {
        // Skip metadata properties starting with @
        if (key.startsWith('@')) {
          return;
        }
        
        const baseName = key.split('@')[0];
        if (!fieldGroups.has(baseName)) {
          fieldGroups.set(baseName, {});
        }
        fieldGroups.get(baseName)![key] = row[key];
        
        // Also check for formatted values
        const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
        if (row[formattedKey]) {
          fieldGroups.get(baseName)![formattedKey] = row[formattedKey];
        }
        
        // Check for lookup logical names
        const lookupKey = `${key}@Microsoft.Dynamics.CRM.lookuplogicalname`;
        if (row[lookupKey]) {
          fieldGroups.get(baseName)![lookupKey] = row[lookupKey];
        }
      });

      const attributes = new Map<string, CellData>();
      let dataverseRowLink = '';

      // Get the entity's unique ID field
      const recordId = row[`${primaryEntityName}id`] || 
                   row[primaryEntityName + 'id'] || 
                   (row['_' + primaryEntityName + 'id_value']) ||
                   '';
                   
      // Build the entity URL if we have an ID and environment URL
      if (recordId && environmentBrowserUrl) {
        dataverseRowLink = `${environmentBrowserUrl}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${primaryEntityName}&id=${recordId}`;
      }

      // Convert field groups to attributes
      fieldGroups.forEach((fields, baseName) => {
        const dto: CellData = {
          attributeLogicalName: baseName,
          attributeRawValue: '',
        };

        if (Object.keys(fields).length > 1) {
          let attributeName = baseName;
          if (baseName.startsWith('_') && baseName.endsWith('_value')) {
            attributeName = baseName.substring(1, baseName.length - 6);
          }

          dto.attributeLogicalName = attributeName;

          if (fields[baseName] !== undefined) {
            dto.attributeRawValue = fields[baseName];
          }

          const formattedValueKey = `${baseName}@OData.Community.Display.V1.FormattedValue`;
          if (fields[formattedValueKey] !== undefined) {
            dto.attributeFormattedValue = fields[formattedValueKey];
          }

          const lookupLogicalNameKey = `${baseName}@Microsoft.Dynamics.CRM.lookuplogicalname`;
          const lookupLogicalName = fields[lookupLogicalNameKey];

          if (dto.attributeRawValue && lookupLogicalName) {
            dto.lookupLogicalName = lookupLogicalName;
            dto.link = `${environmentBrowserUrl}/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${lookupLogicalName}&id=${dto.attributeRawValue}`;
          }
        } else {
          dto.attributeRawValue = fields[baseName];
        }

        attributes.set(dto.attributeLogicalName, dto);
      });

      return {
        rowIndex,
        attributes,
        rowJson: row,
        dataverseRowLink
      };
    });

    return rows;
  } catch (error) {
    return [];
  }
}

export function processRawDataToAllAttributes(rawData: RowData[], metadataAttributes: { [attributeLogicalName: string]: AttributeModel }): RowData[] {
  const expectedAttributeCount = Object.keys(metadataAttributes).length;

  return rawData.map(row => {
    if (row.attributes.size < expectedAttributeCount) {
      const missingAttributes = Object.keys(metadataAttributes).filter(attrName => !row.attributes.has(attrName));

      missingAttributes.forEach(attrName => {
        row.attributes.set(attrName, {
          attributeLogicalName: attrName,
          attributeRawValue: '',
          attributeFormattedValue: ''
        });
      });
    }

    return row;
  });
}

export function getHeaderFromAttributeMetadata(metadataAttributes: { [attributeLogicalName: string]: AttributeModel }): { [attributeLogicalName: string]: HeaderMetadata } {
  return Object.keys(metadataAttributes).reduce((acc, attrName) => {
    acc[attrName] = {
      logicalName: attrName,
      displayName: metadataAttributes[attrName].displayName,
      type: metadataAttributes[attrName].attributeType
    };
    return acc;
  }, {});
}

export function normalizeResultAttributes(
  rawData: any[],
  metadataAttributes?: { [attributeLogicalName: string]: AttributeModel },
  primaryEntityName?: string,
  environmentBrowserUrl?: string): MatTableRawData {

  if (!rawData || rawData.length === 0) {
    return { header: {}, rows: [], __original_data: [] };
  }
  
  if (!metadataAttributes || Object.keys(metadataAttributes).length === 0) {
    // Try to extract schema from the data itself if we don't have metadata
    const header = extractHeaderFromData(rawData);
    return {
      header,
      rows: processOriginalDataToRowData(rawData, primaryEntityName, environmentBrowserUrl),
      __original_data: rawData
    };
  }

  try {
    // Process the raw data into structured row data
    const rowData = processOriginalDataToRowData(rawData, primaryEntityName, environmentBrowserUrl);

    // Ensure all attributes from metadata are included in each row
    const rowDataWithAllAttributes = processRawDataToAllAttributes(rowData, metadataAttributes);

    // Generate the header from metadata
    const header = getHeaderFromAttributeMetadata(metadataAttributes);

    return {
      header,
      rows: rowDataWithAllAttributes,
      __original_data: rawData
    };
  } catch (error) {
    return { header: {}, rows: [], __original_data: rawData };
  }
}

// Helper function to extract header information from the data itself when no metadata is available
function extractHeaderFromData(data: any[]): { [attributeLogicalName: string]: HeaderMetadata } {
  if (!data || data.length === 0) {
    return {};
  }
  
  const sample = data[0];
  const header: { [attributeLogicalName: string]: HeaderMetadata } = {};
  
  // Get all potential field names
  const keys = Object.keys(sample).filter(key => !key.includes('@')); // Exclude metadata fields
  
  keys.forEach(key => {
    const value = sample[key];
    let type = 'string'; // default type
    
    // Try to determine type from the value
    if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    } else if (value && typeof value === 'string') {
      // Check if it looks like a GUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        type = 'uniqueidentifier';
      } 
      // Check if it looks like a date
      else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        type = 'datetime';
      }
    }
    
    // Look for formatted value field to get a display name
    const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`;
    const displayName = sample[formattedKey] ? key : key; // Use the same key if no formatted field
    
    header[key] = {
      logicalName: key,
      displayName: displayName,
      type: type
    };
  });
  
  return header;
}

@Injectable()
export class AllAttributesStrategy implements IResultProcessingStrategy {

  constructor(
    private attributeEntityService: AttributeEntityService
  ) { }

  processRawData(
    rawData: any[], 
    entityAttributeMap: EntityAttributeMap,
    primaryEntityName: string, 
    environmentBrowserUrl: string): Observable<MatTableRawData> {

     if (!rawData || !rawData.length) {
       return of({ header: {}, rows: [], __original_data: [] });
     }

     return from(this.loadAllAttributes(primaryEntityName)).pipe(
       map(attributeMaps => {
         return normalizeResultAttributes(rawData, attributeMaps, primaryEntityName, environmentBrowserUrl);
       }),
       catchError(err => {
         // Return an empty result on error instead of propagating the error
         return of({ header: {}, rows: [], __original_data: rawData });
       })
     );
   }

  processResults(
    result: any,
    entityAttributeMap: EntityAttributeMap,
    attributeMaps?: { [entityLogicalName: string]: Map<string, AttributeModel> }
  ): any {
    // For AllAttributesStrategy, no additional processing needed
    return result;
  }

  /**
   * Load all attributes for the given entities using the AttributeEntityService
   */
  async loadAllAttributes(entityLogicalName: string): Promise<{ [attributeLogicalName: string]: AttributeModel }> {
    // Get all attributes for this entity
    const attributes = await firstValueFrom(this.attributeEntityService.getAttributes(entityLogicalName));

    const attributeMap: { [logicalName: string]: AttributeModel } = {};
    attributes.forEach(attr => {
      attributeMap[attr.logicalName] = attr;
    });

    return attributeMap;
  }
} 