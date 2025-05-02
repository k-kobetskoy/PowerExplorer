import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { NodeAttribute } from '../../../models/node-attribute';
import { QueryNode } from '../../../models/query-node';
import { ValidationService } from '../../validation.service';
import { IAttributeValidators } from '../abstract/i-attribute-validators';
import { ValueAttributeData } from '../../../models/constants/attribute-data';

@Injectable({ providedIn: 'root' })
export class ValueAttributesFactoryService implements IAttributeFactory {

  constructor(
    private validationService: ValidationService
  ) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    const validators: IAttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    if (attributeName === ValueAttributeData.InnerText.EditorName) {
      return new NodeAttribute(
        this.validationService,
        node,
        validators,
        ValueAttributeData.InnerText,
        value,
        parserValidation
      );
    }

    return new NodeAttribute(
      this.validationService,
      node,
      validators,
      { Order: 99, EditorName: attributeName },
      value,
      parserValidation
    );
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): IAttributeValidators {
    // Add any specific validators for value node attributes if needed
    return {
      oneTimeValidators: [],
      validators: []
    };
  }
} 