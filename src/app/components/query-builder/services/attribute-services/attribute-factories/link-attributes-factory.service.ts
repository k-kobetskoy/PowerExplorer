import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { NodeAttribute } from '../../../models/node-attribute';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { ValidationService } from '../../validation.service';
import { IAttributeValidators } from '../abstract/i-attribute-validators';
import { IAttributeOneTimeValidator } from '../abstract/i-attribute-one-time-validator';

@Injectable({ providedIn: 'root' })
export class LinkAttributesFactoryService implements IAttributeFactory {

    constructor(private validationService: ValidationService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {

    const validators: IAttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Link;


    switch (attributeName) {
      case attribute.Entity.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Entity, value, parserValidation);
      case attribute.Alias.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Alias, value, parserValidation);
      case attribute.Type.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Type, value, parserValidation);
      case attribute.Intersect.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Intersect, value, parserValidation);
      case attribute.From.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.From, value, parserValidation);
      case attribute.To.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.To, value, parserValidation);
      case attribute.Visible.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Visible, value, parserValidation);
      case attribute.ShowOnlyLookups.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.ShowOnlyLookups, value, parserValidation);
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
      case AttributeNames.linkType:
        return []
      case AttributeNames.linkIntersect:
        return []
      case AttributeNames.linkVisible:
        return []
      default:
        return []
    }
  }

  getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.linkEntity:
        return []
      case AttributeNames.linkFromAttribute:
        return []
      case AttributeNames.linkToAttribute:
        return []
      case AttributeNames.linkAlias:
        return []
      default:
        return []
    }
  }
}
