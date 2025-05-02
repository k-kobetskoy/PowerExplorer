import { TypeBooleanValidatorService } from './../validators/attributes/parser/type-boolean-validator.service';
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
import { EntityNameServerValidatorService } from '../validators/attributes/entity-name-server-validator.service';
import { FromAttributeLinkEntityServerValidatorService } from '../validators/attributes/from-attribute-link-entity-server-validator.service';
import { ToAttributeLinkEntityServerValidatorService } from '../validators/attributes/to-attribute-link-entity-server-validator.service';
import { AttributeAliasValueValidatorService } from '../validators/attributes/attribute-alias-value-validator.service';
import { LinkTypeValidatorService } from '../validators/attributes/one-time-validators/link-type-validator.service';
@Injectable({ providedIn: 'root' })
export class LinkAttributesFactoryService implements IAttributeFactory {

    constructor(
      private validationService: ValidationService,
      private entityNameServerValidatorService: EntityNameServerValidatorService,
      private fromAttributeLinkEntityServerValidatorService: FromAttributeLinkEntityServerValidatorService,
      private toAttributeLinkEntityServerValidatorService: ToAttributeLinkEntityServerValidatorService,
      private aliasValueValidatorService: AttributeAliasValueValidatorService,
      private attributeTypeBooleanValidatorService: TypeBooleanValidatorService,
      private linkTypeValidatorService: LinkTypeValidatorService
    ) { }

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
      case attribute.FetchAllEntities.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.FetchAllEntities, value, parserValidation);
      default:
        return new NodeAttribute(this.validationService, node, validators, { Order: 99, EditorName: attributeName }, value, parserValidation);
    }
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): IAttributeValidators {
    let parsingValidators: IAttributeOneTimeValidator[] = [];
    if (parserValidation) {
      parsingValidators = this.getParserValidators(attributeName);
    }

    return { validators: this.getDefaultValidators(attributeName), oneTimeValidators: parsingValidators };
  }

  private getParserValidators(attributeName: string): IAttributeOneTimeValidator[] {
    switch (attributeName) {
      case AttributeNames.linkType:
        return [this.linkTypeValidatorService]
      case AttributeNames.linkIntersect:
        return []
      case AttributeNames.linkVisible:
        return []
      case AttributeNames.linkEntity:
        return []
      case AttributeNames.linkFromAttribute:
        return []
      case AttributeNames.linkToAttribute:
        return []
      default:
        return []
    }
  }

  getDefaultValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.linkEntity:
        return [this.entityNameServerValidatorService]
      case AttributeNames.linkFromAttribute:
        return [this.fromAttributeLinkEntityServerValidatorService]
      case AttributeNames.linkToAttribute:
        return [this.toAttributeLinkEntityServerValidatorService]
      case AttributeNames.linkAlias:
        return [this.aliasValueValidatorService]
      case AttributeNames.linkVisible:
        return [this.attributeTypeBooleanValidatorService]
      case AttributeNames.linkIntersect:
        return [this.attributeTypeBooleanValidatorService]
      case AttributeNames.linkType:
        return []
      default:
        return []
    }
  }
}
