import { XmlExecutionResult } from '../xml-executor.service';

/**
 * Utility function to ensure that all rows in a result set have the same structure
 * by collecting all attributes present in any row and ensuring they exist in all rows.
 * 
 * This is particularly useful when Dataverse returns records with inconsistent fields
 * (e.g., some rows have certain fields and others don't).
 * 
 * @param result The result data to normalize
 * @param metadataAttributes Optional map of attribute metadata that might not be in the data
 * @returns A normalized result with consistent attributes across all rows
 */
export function normalizeResultAttributes(
  result: XmlExecutionResult, 
  metadataAttributes?: { [logicalName: string]: any }
): XmlExecutionResult {
  if (!result || !result.rawValues || result.rawValues.length === 0) {
    console.log('[normalizeResultAttributes] No data to process, returning original result');
    return result;
  }

  // Clone the result to avoid modifying the original
  const processedResult: XmlExecutionResult = {
    header: { ...result.header },
    rawValues: [...result.rawValues],
    formatedValues: result.formatedValues ? [...result.formatedValues] : [],
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
      
      if (processedResult.formatedValues && processedResult.formatedValues[i]) {
        const formattedRow = processedResult.formatedValues[i];
        
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