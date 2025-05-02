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
export class OrderAttributesFactoryService implements IAttributeFactory {

  constructor(private validationService: ValidationService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {

    const validators: IAttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Order;

    switch (attributeName) {
      case attribute.Attribute.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Attribute, value, parserValidation);
      case attribute.Alias.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Alias, value, parserValidation);
      case attribute.Desc.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Desc, value, parserValidation);
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
      case AttributeNames.orderDescending:
        return []
      default:
        return []
    }
  }

  private getParserAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.orderAttribute:
        return []
      default:
        return []
    }
  }

  private getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.orderAttribute:
        return []
      case AttributeNames.orderAlias:
        return []
      default:
        return []
    }
  }
}
