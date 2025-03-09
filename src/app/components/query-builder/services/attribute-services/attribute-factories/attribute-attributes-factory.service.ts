import { AttributeValidationTypes } from '../validators/constants/attribute-validation-types';
import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { AttributeValueTypes } from '../../../models/constants/attribute-value-types';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeValidators } from '../../../models/attribute-validators';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

@Injectable({ providedIn: 'root' })

export class AttributeAttributesFactoryService implements IAttributeFactory {

  constructor() { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {

    const validators: AttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Attribute;

    switch (attributeName) {
      case attribute.Name.EditorName:
        return new NodeAttribute(node, validators, attribute.Name, value);
      case attribute.Alias.EditorName:
        return new NodeAttribute(node, validators, attribute.Alias, value);
      case attribute.Aggregate.EditorName:
        return new NodeAttribute(node, validators, attribute.Aggregate, value);
      case attribute.GroupBy.EditorName:
        return new NodeAttribute(node, validators, attribute.GroupBy, value);
      case attribute.Distinct.EditorName:
        return new NodeAttribute(node, validators, attribute.Distinct, value);
      case attribute.UserTimeZone.EditorName:
        return new NodeAttribute(node, validators, attribute.UserTimeZone, value);
      case attribute.DateGrouping.EditorName:
        return new NodeAttribute(node, validators, attribute.DateGrouping, value);
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
      case AttributeNames.attributeAggregate:
        return [
          this.validators.list(AttributeValidationTypes.attributeAggregateList),
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure)
        ]
      case AttributeNames.attributeGroupBy:
        return [
          this.validators.type(AttributeValueTypes.boolean),
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
          this.validators.condition(AttributeValidationTypes.attributeDistinctFalse),
        ]
      case AttributeNames.attributeDistinct:
        return [
          this.validators.type(AttributeValueTypes.boolean),
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
          this.validators.condition(AttributeValidationTypes.attributeGroupByFalse),
        ]
      case AttributeNames.attributeUserTimeZone:
        return [
          this.validators.type(AttributeValueTypes.boolean),
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
          this.validators.condition(AttributeValidationTypes.attributeGroupByTrue),
        ]
      case AttributeNames.attributeDateGrouping:
        return [
          this.validators.list(AttributeValidationTypes.attributeDateGrouping),
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
          this.validators.condition(AttributeValidationTypes.attributeGroupByTrue),
        ]
      default:
        return []
    }
  }

  private getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.attributeName:
        return [
          this.validators.server(AttributeValidationTypes.serverParentEntityAttribute),
        ];
      case AttributeNames.attributeAlias:
        return [
          this.validators.string(AttributeValidationTypes.alias)
        ]
      case AttributeNames.attributeAggregate:
        return [
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
        ]
      case AttributeNames.attributeGroupBy:
        return [
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
          this.validators.condition(AttributeValidationTypes.attributeDistinctFalse),
        ]
      case AttributeNames.attributeDistinct:
        return [
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
          this.validators.condition(AttributeValidationTypes.attributeGroupByFalse),
        ]
      case AttributeNames.attributeUserTimeZone:
        return [
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
          this.validators.condition(AttributeValidationTypes.attributeGroupByTrue),
        ]
      case AttributeNames.attributeDateGrouping:
        return [
          this.validators.condition(AttributeValidationTypes.attributeFetchAggregateTure),
          this.validators.condition(AttributeValidationTypes.attributeGroupByTrue),
        ]
      default:
        return []
    }
  }
}
