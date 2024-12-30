import { AttributeValidators } from '../../../models/attribute-validators';
import { AttributeValidationTypes } from '../constants/attribute-validation-types';
import { Injectable } from '@angular/core';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { AttributeValidatorRegistryService } from '../attribute-validator-registry.service';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { NodeAttribute } from '../../../models/node-attribute';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

@Injectable({ providedIn: 'root' })

export class RootAttributesFactoryService implements IAttributeFactory {

  constructor(private validators: AttributeValidatorRegistryService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {

    const validators: AttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Root;

    switch (attributeName) {
      case attribute.Top.EditorName:
        return new NodeAttribute(node, validators, attribute.Top, value);
      case attribute.Distinct.EditorName:
        return new NodeAttribute(node, validators, attribute.Distinct, value);
      case attribute.Aggregate.EditorName:
        return new NodeAttribute(node, validators, attribute.Aggregate, value);
      case attribute.TotalRecordsCount.EditorName:
        return new NodeAttribute(node, validators, attribute.TotalRecordsCount, value);
      case attribute.RecordsPerPage.EditorName:
        return new NodeAttribute(node, validators, attribute.RecordsPerPage, value);
      case attribute.Page.EditorName:
        return new NodeAttribute(node, validators, attribute.Page, value);
      case attribute.PagingCookie.EditorName:
        return new NodeAttribute(node, validators, attribute.PagingCookie, value);
      case attribute.LateMaterialize.EditorName:
        return new NodeAttribute(node, validators, attribute.LateMaterialize, value);
      case attribute.DataSource.EditorName:
        return new NodeAttribute(node, validators, attribute.DataSource, value);
      case attribute.Options.EditorName:
        return new NodeAttribute(node, validators, attribute.Options, value);
      default:
        return new NodeAttribute(node, validators, { Order: 99, EditorName: attributeName, IsValidName: false }, value);
    }
  }


  private getAttributeValidators(attributeName: string, parserValidation: boolean): AttributeValidators {
    let parsingSyncValidators: IAttributeValidator[] = [];
    let parsingAsyncValidators: IAttributeValidator[] = [];
    if (parserValidation) {
      parsingSyncValidators = this.getParserSynchronousValidators(attributeName);
      parsingAsyncValidators = this.getParserAsyncValidators(attributeName);
    }

    return { defaultAsyncValidators: this.getDefaultAsyncValidators(attributeName), parsingAsyncValidators: parsingAsyncValidators, parsingSynchronousValidators: parsingSyncValidators };
  }

  private getDefaultAsyncValidators(attributeName: string): IAttributeValidator[] {
    return [];
  }

  private getParserAsyncValidators(attributeName: string): IAttributeValidator[] {
    return [];
  }

  private getParserSynchronousValidators(attributeName: string): IAttributeValidator[] {
    switch (attributeName) {
      case AttributeNames.rootTop:
        return [this.validators.type(AttributeValidationTypes.typeNumber)]
      case AttributeNames.rootDistinct:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      case AttributeNames.rootAggregate:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      case AttributeNames.rootTotalRecordsCount:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      case AttributeNames.rootLateMaterialize:
        return [this.validators.type(AttributeValidationTypes.typeBoolean)]
      case AttributeNames.rootTotalRecordsCount:
        return [this.validators.type(AttributeValidationTypes.typeNumber)]
      case AttributeNames.rootPage:
        return [this.validators.type(AttributeValidationTypes.typeNumber)]
      default:
        return []
    }
  }
}