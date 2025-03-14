import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidators } from '../abstract/i-attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { IAttributeOneTimeValidator } from '../abstract/i-attribute-one-time-validator';
import { AttributeAliasValueValidatorService } from '../validators/attributes/attribute-alias-value-validator.service';
import { EntityNameServerValidatorService } from '../validators/attributes/entity-name-server-validator.service';
import { NodeAttributesNamesValidatorService } from '../validators/attributes/one-time-validators/node-attributes-names-validator.service';

@Injectable({ providedIn: 'root' })

export class EntityAttributesFacoryService implements IAttributeFactory {

  constructor(
    private aliasValueValidatorService: AttributeAliasValueValidatorService,
    private entityNameServerValidatorService: EntityNameServerValidatorService,
    private nodeAttributesNamesValidatorService: NodeAttributesNamesValidatorService
  ) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {

    const validators: IAttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Entity;

    switch (attributeName) {
      case attribute.Name.EditorName:
        return new NodeAttribute(node, validators, attribute.Name, value, parserValidation);
      case attribute.Alias.EditorName:
        return new NodeAttribute(node, validators, attribute.Alias, value, parserValidation);
      default:
        return new NodeAttribute(node, validators, { Order: 99, EditorName: attributeName }, value, parserValidation);
    }
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): IAttributeValidators {

    let oneTimeValidators: IAttributeOneTimeValidator[] = [];

    if (parserValidation) {
      oneTimeValidators = this.getParserOneTimeValidators(attributeName);
    }

    return {
      validators: this.getDefaultValidators(attributeName),
      oneTimeValidators: oneTimeValidators
    };
  }
  
  getParserOneTimeValidators(attributeName: string): IAttributeOneTimeValidator[] {
    return [this.nodeAttributesNamesValidatorService];
  }

  private getDefaultValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.entityName:
        return [this.entityNameServerValidatorService]
      case AttributeNames.entityAlias:
        return [this.aliasValueValidatorService]
      default:
        return []
    }
  }
}
