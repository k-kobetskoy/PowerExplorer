import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { AttributeValidationTypes } from '../validators/OBSOLETE constants/OBSOLETE attribute-validation-types';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeValidators } from '../../../models/attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

@Injectable({ providedIn: 'root' })

export class LinkAttributesFactoryService implements IAttributeFactory {

  constructor() { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {

    const validators: AttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Link;


    switch (attributeName) {
      case attribute.Entity.EditorName:
        return new NodeAttribute(node, validators, attribute.Entity, value, parserValidation);
      case attribute.Alias.EditorName:
        return new NodeAttribute(node, validators, attribute.Alias, value, parserValidation);
      case attribute.Type.EditorName:
        return new NodeAttribute(node, validators, attribute.Type, value, parserValidation);
      case attribute.Intersect.EditorName:
        return new NodeAttribute(node, validators, attribute.Intersect, value, parserValidation);
      case attribute.From.EditorName:
        return new NodeAttribute(node, validators, attribute.From, value, parserValidation);
      case attribute.To.EditorName:
        return new NodeAttribute(node, validators, attribute.To, value, parserValidation);
      case attribute.Visible.EditorName:
        return new NodeAttribute(node, validators, attribute.Visible, value, parserValidation);
      case attribute.ShowOnlyLookups.EditorName:
        return new NodeAttribute(node, validators, attribute.ShowOnlyLookups, value, parserValidation);
      default:
        return new NodeAttribute(node, validators, { Order: 99, EditorName: attributeName }, value, parserValidation);
    }
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): AttributeValidators {
    let parsingSyncValidators: IAttributeValidator[] = [];
    let parsingAsyncValidators: IAttributeValidator[] = [];
    if (parserValidation) {
      parsingSyncValidators = this.getParserSynchronousValidators(attributeName);
      parsingAsyncValidators = this.getParserAsyncValidators(attributeName);
    }

    return { defaultAsyncValidators: this.getDefaultAsyncValidators(attributeName), parsingSynchronousValidators: parsingSyncValidators };
  }

  private getParserAsyncValidators(attributeName: string): IAttributeValidator[] {
    return []
  }

  private getParserSynchronousValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.linkType:
        return [this.validators.list(AttributeValidationTypes.listLinkType)]
      case AttributeNames.linkIntersect:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      case AttributeNames.linkVisible:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      default:
        return []
    }
  }

  getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.linkEntity:
        return [this.validators.server(AttributeValidationTypes.serverEntity)]
      case AttributeNames.linkFromAttribute:
        return [this.validators.server(AttributeValidationTypes.serverLinkEntityAttribute)]
      case AttributeNames.linkToAttribute:
        return [this.validators.server(AttributeValidationTypes.serverParentEntityAttribute)]
      case AttributeNames.linkAlias:
        return [this.validators.string(AttributeValidationTypes.alias)]
      default:
        return []
    }
  }
}
