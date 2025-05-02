import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { AttributeValidationTypes } from '../validators/OBSOLETE constants/OBSOLETE attribute-validation-types';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeValidators } from '../../../models/attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { ValidationService } from '../../validation.service';
import { IAttributeValidators } from '../abstract/i-attribute-validators';
import { IAttributeOneTimeValidator } from '../abstract/i-attribute-one-time-validator';
@Injectable({ providedIn: 'root' })

export class FilterAttributesFactoryService implements IAttributeFactory {

  constructor(private validationService: ValidationService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    
    const validators: IAttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Filter;

    switch (attributeName) {
      case attribute.Type.EditorName:
        return new NodeAttribute(this.validationService, node, validators,  attribute.Type, value, parserValidation);
      case AttributeNames.filterIsQuickFind:
        return new NodeAttribute(this.validationService, node, validators,  attribute.IsQuickFind, value, parserValidation);
      case AttributeNames.filterBypassQuickFind:
        return new NodeAttribute(this.validationService, node, validators,  attribute.BypassQuickFind, value, parserValidation);
      case AttributeNames.filterOverrideRecordLimit:
        return new NodeAttribute(this.validationService, node, validators,  attribute.OverrideRecordLimit, value, parserValidation);
      default:
        return new NodeAttribute(this.validationService, node, validators, { Order: 99, EditorName: attributeName }, value, parserValidation);
    }
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): IAttributeValidators {
    let parsingSyncValidators: IAttributeOneTimeValidator[] = [];
    let parsingAsyncValidators: IAttributeValidator[] = [];
    if (parserValidation) {
      parsingSyncValidators = this.getParserSynchronousValidators(attributeName);
      parsingAsyncValidators = this.getParserAsyncValidators(attributeName);
    }

    return { validators: this.getDefaultAsyncValidators(attributeName), oneTimeValidators: parsingSyncValidators };
  }

  private getParserSynchronousValidators(attributeName: string): IAttributeOneTimeValidator[] {
    switch (attributeName) {
      case AttributeNames.filterType:
        return []
      case AttributeNames.filterIsQuickFind:
        return []
      case AttributeNames.filterBypassQuickFind:
        return []
      case AttributeNames.filterOverrideRecordLimit:
        return []
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
