import { AttributeValidationTypes } from '../validators/OBSOLETE constants/OBSOLETE attribute-validation-types';
import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeValidators } from '../../../models/attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { ValidationService } from '../../validation.service';
import { IAttributeValidators } from '../abstract/i-attribute-validators';
import { IAttributeOneTimeValidator } from '../abstract/i-attribute-one-time-validator';
@Injectable({ providedIn: 'root' })

export class ConditionAttributesFactoryService implements IAttributeFactory {

  constructor(private validationService: ValidationService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    const validators: IAttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Condition;

    switch (attributeName) {
      case attribute.Entity.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Entity, value, parserValidation);
      case attribute.Attribute.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Attribute, value, parserValidation);
      case attribute.Operator.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Operator, value, parserValidation);
      case attribute.Value.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Value, value, parserValidation);
      case attribute.ValueOf.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.ValueOf, value, parserValidation);
      default:
        return new NodeAttribute(this.validationService, node, validators, { Order: 99, EditorName: attributeName }, value, parserValidation);
    }
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): IAttributeValidators {
    let parsingSyncValidators: IAttributeOneTimeValidator[] = [];

    if (parserValidation) {
      parsingSyncValidators = this.getParserSynchronousValidators(attributeName);
    }

    return { validators: this.getDefaultAsyncValidators(attributeName), oneTimeValidators: parsingSyncValidators };
  }

  private getParserSynchronousValidators(attributeName: string): IAttributeOneTimeValidator[] {
    switch (attributeName) {
      case AttributeNames.conditionEntity:
        return []  //TODO: implement
      case AttributeNames.conditionValue:
        return []
      case AttributeNames.conditionOperator:
        return []
      case AttributeNames.conditionValueOf:
        return []  // should check if the ValueOf is of the same type as the condition attribute
      default:
        return []
    }
  }

  private getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.conditionEntity:
        return []  //TODO: implement
      case AttributeNames.conditionAttribute:
        return []
      default:
        return []
    }
  }
}
