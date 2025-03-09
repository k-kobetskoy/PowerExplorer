import { AttributeValidationTypes } from '../validators/constants/attribute-validation-types';
import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { AttributeValidatorRegistryService } from '../attribute-validator-registry.service';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeValidators } from '../../../models/attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

@Injectable({ providedIn: 'root' })

export class ConditionAttributesFactoryService implements IAttributeFactory {

  constructor(private validators: AttributeValidatorRegistryService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    const validators: AttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Condition;

    switch (attributeName) {
      case attribute.Entity.EditorName:
        return new NodeAttribute(node, validators, attribute.Entity, value);
      case attribute.Attribute.EditorName:
        return new NodeAttribute(node, validators, attribute.Attribute, value);
      case attribute.Operator.EditorName:
        return new NodeAttribute(node, validators, attribute.Operator, value);
      case attribute.Value.EditorName:
        return new NodeAttribute(node, validators, attribute.Value, value);
      case attribute.ValueOf.EditorName:
        return new NodeAttribute(node, validators, attribute.ValueOf, value);
      default:
        return new NodeAttribute(node, validators, { Order: 99, EditorName: attributeName, IsValidName: false }, value);
    }
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): AttributeValidators {
    let parsingSyncValidators: IAttributeValidator[] = [];

    if (parserValidation) {
      parsingSyncValidators = this.getParserSynchronousValidators(attributeName);
    }

    return { defaultAsyncValidators: this.getDefaultAsyncValidators(attributeName), parsingSynchronousValidators: parsingSyncValidators };
  }

  private getParserSynchronousValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.conditionEntity:
        return []  //TODO: implement
      case AttributeNames.conditionValue:
        return [
          this.validators.type(AttributeValidationTypes.conditionValueTypes) // check if value is of attribute's type
        ]
      case AttributeNames.conditionOperator:
        return [
          this.validators.list(AttributeValidationTypes.conditionValueList) // should check if value is in the list of operators allowed for attribute
        ]
      case AttributeNames.conditionValueOf:
        return [
          this.validators.server(AttributeValidationTypes.serverValueOfAttribute), // should check if the ValueOf is of the same type as the condition attribute
        ]
      default:
        return []
    }
  }

  private getParserAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.conditionEntity:
        return []  //TODO: implement
      case AttributeNames.conditionValue:
        return [
          this.validators.condition(AttributeValidationTypes.conditionValueAttributeNameNotNull),
        ]
      case AttributeNames.conditionOperator:
        return [
          this.validators.condition(AttributeValidationTypes.conditionValueAttributeNameNotNull),
        ]
      case AttributeNames.conditionValueOf:
        return [
          this.validators.condition(AttributeValidationTypes.conditionValueAttributeNameNotNull),
        ]
      default:
        return []
    }
  }

  private getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.conditionEntity:
        return []  //TODO: implement
      case AttributeNames.conditionAttribute:
        return [this.validators.server(AttributeValidationTypes.serverParentEntityAttribute)]
      default:
        return []
    }
  }
}
