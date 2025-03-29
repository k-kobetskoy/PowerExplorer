import { XmlExecutionResult } from '../xml-executor.service';
import { EntityAttributeMap } from '../entity-services/attribute-entity.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { Observable } from 'rxjs';

/**
 * Interface for handling different result processing strategies
 */
export interface ResultProcessingStrategy {
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
   * Process result with complete data loading and processing in a single step.
   * This method will handle both loading the necessary attributes and processing 
   * the result in one operation, avoiding duplicate processing.
   * 
   * @param result The original result data from the server
   * @param entityAttributeMap Map of entity logical names to their attribute data
   * @returns Observable of the processed result
   */
  processResultsWithData(
    result: XmlExecutionResult,
    entityAttributeMap: EntityAttributeMap
  ): Observable<XmlExecutionResult>;
  
  /**
   * Load all attributes for the given entities
   * @param entityLogicalNames Array of entity logical names to load attributes for
   * @returns Promise that resolves when all attributes are loaded
   */
  loadAllAttributes?(entityLogicalNames: string[]): Promise<{ [entityLogicalName: string]: Map<string, AttributeModel> }>;
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