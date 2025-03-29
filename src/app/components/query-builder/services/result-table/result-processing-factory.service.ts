import { Injectable } from '@angular/core';
import { 
  ResultProcessingStrategy, 
  ProcessingStrategyType, 
  determineProcessingStrategy 
} from './result-processing-strategy';
import { DefinedAttributesStrategy } from './defined-attributes-strategy';
import { AllAttributesStrategy } from './all-attributes-strategy';
import { EntityAttributeMap } from '../entity-services/attribute-entity.service';
import { AttributeEntityService } from '../entity-services/attribute-entity.service';

@Injectable({
  providedIn: 'root'
})
export class ResultProcessingFactoryService {
  
  private definedAttributesStrategy: DefinedAttributesStrategy;
  private allAttributesStrategy: AllAttributesStrategy;
  
  constructor(private attributeEntityService: AttributeEntityService) {
    this.definedAttributesStrategy = new DefinedAttributesStrategy(attributeEntityService);
    this.allAttributesStrategy = new AllAttributesStrategy(attributeEntityService);
  }

  /**
   * Get the appropriate result processing strategy based on the entity attribute map
   * @param entityAttributeMap Map of entity logical names to their attribute data
   * @returns The appropriate result processing strategy
   */
  getStrategy(entityAttributeMap: EntityAttributeMap): ResultProcessingStrategy {
    console.log('[ResultProcessingFactoryService] Getting appropriate strategy');
    
    const strategyType = determineProcessingStrategy(entityAttributeMap);
    console.log(`[ResultProcessingFactoryService] Strategy type determined: ${ProcessingStrategyType[strategyType]}`);
    
    switch (strategyType) {
      case ProcessingStrategyType.ALL_ATTRIBUTES:
        console.log('[ResultProcessingFactoryService] Returning AllAttributesStrategy');
        return this.allAttributesStrategy;
      case ProcessingStrategyType.DEFINED_ATTRIBUTES:
      default:
        console.log('[ResultProcessingFactoryService] Returning DefinedAttributesStrategy');
        return this.definedAttributesStrategy;
    }
  }
} 