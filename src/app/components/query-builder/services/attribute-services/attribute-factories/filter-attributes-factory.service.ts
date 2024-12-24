import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeValidatorRegistryService } from '../attribute-validator-registry.service';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { AttributeValidationTypes } from '../constants/attribute-validation-types';
import { IQueryNode } from '../../../models/abstract/OBSOLETE i-query-node';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeValidators } from '../../../models/attribute-validators';
import { AttributeTreeViewDisplayStyle } from '../../../models/constants/attribute-tree-view-display-style';

@Injectable({ providedIn: 'root' })

export class FilterAttributesFactoryService implements IAttributeFactory {

  constructor(private validators: AttributeValidatorRegistryService) { }

  createAttribute(attributeName: string, node: IQueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    
    const validators: AttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    switch (attributeName) {
      case AttributeNames.filterType:
        return new NodeAttribute(node, attributeName, validators,  'FilterType', AttributeTreeViewDisplayStyle.onlyValue, value);
      case AttributeNames.filterIsQuickFind:
      case AttributeNames.filterBypassQuickFind:
      case AttributeNames.filterOverrideRecordLimit:
        return new NodeAttribute(node, attributeName, validators, null, null, value);
      default:
        return new NodeAttribute(node, attributeName, validators, null, null, value, null, false);
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
