import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { DataverseEntityTypeNames } from '../../../models/constants/dataverse-entity-type-names';
import { AttributeValidationTypes } from '../validators/constants/attribute-validation-types';
import { AttributeValidatorRegistryService } from '../attribute-validator-registry.service';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeValidators } from '../../../models/attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

@Injectable({ providedIn: 'root' })

export class EntityAttributesFacoryService implements IAttributeFactory {

  constructor(private validators: AttributeValidatorRegistryService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    
    const validators: AttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Entity;

    switch (attributeName) {
      case attribute.Name.EditorName:
        return new NodeAttribute(node, validators, attribute.Name, value);
      case attribute.Alias.EditorName:
        return new NodeAttribute(node, validators, attribute.Alias, value);
      default:
        return new NodeAttribute(node, validators, { Order: 99, EditorName: attributeName, IsValidName: false }, value);
    }
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): AttributeValidators {
    let parsingSyncValidators: IAttributeValidator[] = [];
    let parsingAsyncValidators: IAttributeValidator[] = [];
    if (parserValidation) {
      parsingSyncValidators = this.getParserSynchronousValidators(attributeName);
      parsingAsyncValidators = this.getParserAsyncValidators(attributeName);
    }

    return { defaultAsyncValidators: this.getDefaultAsyncValidators(attributeName), parsingAsyncValidators: parsingAsyncValidators, parsingSynchronousValidators: parsingSyncValidators };
  }

  private getParserSynchronousValidators(attributeName: string): IAttributeValidator[] {
    return []
  }

  private getParserAsyncValidators(attributeName: string): IAttributeValidator[] {
    return []
  }

  private getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.entityName:
        return [this.validators.server(DataverseEntityTypeNames.entity)]
      case AttributeNames.entityName:
        return [this.validators.string(AttributeValidationTypes.alias)]
      default:
        return []
    }
  }
}
