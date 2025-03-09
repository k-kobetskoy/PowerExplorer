import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeValidatorRegistryService } from '../attribute-validator-registry.service';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { AttributeValidationTypes } from '../validators/constants/attribute-validation-types';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeValidators } from '../../../models/attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

@Injectable({ providedIn: 'root' })

export class FilterAttributesFactoryService implements IAttributeFactory {

  constructor(private validators: AttributeValidatorRegistryService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    
    const validators: AttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Filter;

    switch (attributeName) {
      case attribute.Type.EditorName:
        return new NodeAttribute(node, validators,  attribute.Type, value);
      case AttributeNames.filterIsQuickFind:
        return new NodeAttribute(node, validators,  attribute.IsQuickFind, value);
      case AttributeNames.filterBypassQuickFind:
        return new NodeAttribute(node, validators,  attribute.BypassQuickFind, value);
      case AttributeNames.filterOverrideRecordLimit:
        return new NodeAttribute(node, validators,  attribute.OverrideRecordLimit, value);
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
    switch (attributeName) {
      case AttributeNames.filterType:
        return [this.validators.list(AttributeValidationTypes.listFilterType)]
      case AttributeNames.filterIsQuickFind:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      case AttributeNames.filterBypassQuickFind:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      case AttributeNames.filterOverrideRecordLimit:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      default:
        return []
    }
  }

  private getParserAsyncValidators(attributeName: string): IAttributeValidator[] {
    return []
  }

  private getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    return []
  }
}
