import { XmlExecutionResult } from '../xml-executor.service';
import { EntityAttributeMap } from '../entity-services/attribute-entity.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { Observable } from 'rxjs';
import { MatTableRawData } from '../xml-executor.service';
/**
 * Interface for handling different result processing strategies
 */
export interface IResultProcessingStrategy {
  /**
   * Process raw data from the API and return a processed result
   * @param rawData The original raw data from the API
   * @param entityAttributeMap Map of entity logical names to their attribute data
   * @param primaryEntityName Primary entity name for URL generation 
   * @param environmentBrowserUrl URL prefix for generated links
   * @returns Observable of the processed result
   */
  processRawData(
    rawData: any[], 
    entityAttributeMap: EntityAttributeMap,
    primaryEntityName: string, 
    environmentBrowserUrl: string
  ): Observable<MatTableRawData>;
  
  /**
   * Process the result data and return an updated result object with potentially modified columns
   * @param result The original result data from the server
   * @param entityAttributeMap Map of entity logical names to their attribute data
   * @param attributeMaps Map of entity logical names to their attribute metadata
   * @returns A processed result with potentially additional columns
   */
  processResults(
    result: XmlExecutionResult, 
    entityAttributeMap: EntityAttributeMap,
    attributeMaps?: { [entityLogicalName: string]: Map<string, AttributeModel> }
  ): XmlExecutionResult;
  
  /**
   * Load all attributes for the given entities
   * @param entityLogicalName The entity logical name to load attributes for
   * @returns Promise that resolves when all attributes are loaded
   */
  loadAllAttributes?(entityLogicalName: string): Promise<{ [attributeLogicalName: string]: AttributeModel }> ;
}

/**
 * Enum to identify which processing strategy to use
 */
export enum ProcessingStrategyType {
  DEFINED_ATTRIBUTES,  // At least one attribute is defined in the query
  ALL_ATTRIBUTES       // No attributes defined in the query
}

/**
 * Factory function to determine which strategy to use based on the query
 * @param entityAttributeMap Map of entity logical names to their attribute data
 * @returns The appropriate strategy type
 */
export function determineProcessingStrategy(entityAttributeMap: EntityAttributeMap): ProcessingStrategyType {
  console.log('[determineProcessingStrategy] Analyzing entityAttributeMap:', JSON.stringify(entityAttributeMap));
  
  // If we don't have an entity attribute map, default to DEFINED_ATTRIBUTES
  if (!entityAttributeMap || Object.keys(entityAttributeMap).length === 0) {
    console.log('[determineProcessingStrategy] No entityAttributeMap, defaulting to DEFINED_ATTRIBUTES');
    return ProcessingStrategyType.DEFINED_ATTRIBUTES;
  }

  // Check if any entity in the map has defined attributes
  let hasDefinedAttributes = false;
  
  for (const entityName of Object.keys(entityAttributeMap)) {
    const entityData = entityAttributeMap[entityName];
    console.log(`[determineProcessingStrategy] Checking entity ${entityName}, attributeData length: ${entityData.attributeData?.length || 0}`);
    
    if (entityData.attributeData && entityData.attributeData.length > 0) {
      hasDefinedAttributes = true;
      console.log(`[determineProcessingStrategy] Found defined attributes in entity ${entityName}`);
      break;
    }
  }

  const strategyType = hasDefinedAttributes 
    ? ProcessingStrategyType.DEFINED_ATTRIBUTES 
    : ProcessingStrategyType.ALL_ATTRIBUTES;
    
  console.log(`[determineProcessingStrategy] Determined strategy: ${ProcessingStrategyType[strategyType]}`);
  return strategyType;
} 