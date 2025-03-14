import { AttributeNameWithParentEntityServerValidatorService } from './../validators/attributes/attribute-name-with-parent-entity-server-validator.service';
import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidators } from '../abstract/i-attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

import { AttributeAggregateFunctionNameValidatorService } from '../validators/attributes/parser/attribute-aggregate-function-name-validator.service';
import { TypeBooleanValidatorService } from '../validators/attributes/parser/type-boolean-validator.service';
import { AttributeAliasValueValidatorService } from '../validators/attributes/attribute-alias-value-validator.service';
import { NodeAttributesNamesValidatorService } from '../validators/attributes/one-time-validators/node-attributes-names-validator.service';
import { IAttributeOneTimeValidator } from '../abstract/i-attribute-one-time-validator';
import { AttributeAggregateGroupByValidatorService } from '../validators/attributes/attribute-aggregate-groupby-validator.service';
import { AttributeDateGroupingNameValidatorService } from '../validators/attributes/parser/attribute-dategrouping-name-validator.service';
import { AttributeAggregateConditionFetchAggregateValidatorService } from '../validators/attributes/attribute-aggregate-condition-fetch-aggregate-validator.service';
@Injectable({ providedIn: 'root' })

export class AttributeAttributesFactoryService implements IAttributeFactory {

  constructor(
    private attributeAggregateFunctionNameValidator: AttributeAggregateFunctionNameValidatorService,
    private attributeTypeBooleanValidatorService: TypeBooleanValidatorService,
    private aliasValueValidatorService: AttributeAliasValueValidatorService,
    private attributeNameWithParentEntityServerValidatorService: AttributeNameWithParentEntityServerValidatorService,
    private nodeAttributesNamesValidatorService: NodeAttributesNamesValidatorService,
    private attributeDateGroupingNameValidator: AttributeDateGroupingNameValidatorService,
    private attributeAggregateConditionFetchAggregateValidatorService: AttributeAggregateConditionFetchAggregateValidatorService,
    private attributeAggregateGroupByValidatorService: AttributeAggregateGroupByValidatorService
  ) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {

    const validators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Attribute;

    switch (attributeName) {
      case attribute.Name.EditorName:
        return new NodeAttribute(node, validators, attribute.Name, value, parserValidation);
      case attribute.Alias.EditorName:
        return new NodeAttribute(node, validators, attribute.Alias, value, parserValidation);
      case attribute.Aggregate.EditorName:
        return new NodeAttribute(node, validators, attribute.Aggregate, value, parserValidation);
      case attribute.GroupBy.EditorName:
        return new NodeAttribute(node, validators, attribute.GroupBy, value, parserValidation);
      case attribute.Distinct.EditorName:
        return new NodeAttribute(node, validators, attribute.Distinct, value, parserValidation);
      case attribute.UserTimeZone.EditorName:
        return new NodeAttribute(node, validators, attribute.UserTimeZone, value, parserValidation);
      case attribute.DateGrouping.EditorName:
        return new NodeAttribute(node, validators, attribute.DateGrouping, value, parserValidation);
      default:
        return new NodeAttribute(node, validators, { Order: 99, EditorName: attributeName }, value, parserValidation);
    }
  }

  private getAttributeValidators(attributeName: string, parserValidation: boolean): IAttributeValidators {

    let validators: IAttributeValidator[] = [];
    let oneTimeValidators: IAttributeOneTimeValidator[] = [];

    if (parserValidation) {
      validators = this.getParserValidators(attributeName);
      oneTimeValidators = this.getParserOneTimeValidators(attributeName);
    }

    return {
      validators: [...validators, ...this.getDefaultValidators(attributeName)],
      oneTimeValidators: oneTimeValidators
    };
  }


  getParserOneTimeValidators(attributeName: string): IAttributeOneTimeValidator[] {
    return [this.nodeAttributesNamesValidatorService];
  }

  private getParserValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.attributeAggregate:
        return [this.attributeAggregateFunctionNameValidator]
      case AttributeNames.attributeGroupBy:
        return [this.attributeTypeBooleanValidatorService]
      case AttributeNames.attributeDistinct:
        return [this.attributeTypeBooleanValidatorService]
      case AttributeNames.attributeUserTimeZone:
        return [this.attributeTypeBooleanValidatorService]
      case AttributeNames.attributeDateGrouping:
        return [this.attributeDateGroupingNameValidator]
      default:
        return []
    }
  }

  private getDefaultValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.attributeName:
        return [this.attributeNameWithParentEntityServerValidatorService];
      case AttributeNames.attributeAlias:
        return [this.aliasValueValidatorService];
      case AttributeNames.attributeAggregate:
        return [this.attributeAggregateConditionFetchAggregateValidatorService]
      case AttributeNames.attributeGroupBy:
        return [this.attributeAggregateGroupByValidatorService]
      case AttributeNames.attributeDistinct:
        return [this.attributeTypeBooleanValidatorService]
      case AttributeNames.attributeUserTimeZone:
        return [this.attributeTypeBooleanValidatorService]
      case AttributeNames.attributeDateGrouping:
        return []
      default:
        return []
    }
  }
}
