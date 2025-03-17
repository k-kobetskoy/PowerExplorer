import { AttributeValidators } from '../../../models/attribute-validators';
import { AttributeValidationTypes } from '../validators/OBSOLETE constants/OBSOLETE attribute-validation-types';
import { Injectable } from '@angular/core';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { NodeAttribute } from '../../../models/node-attribute';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { IAttributeValidators } from '../abstract/i-attribute-validators';
import { IAttributeOneTimeValidator } from '../abstract/i-attribute-one-time-validator';
import { ValidationService } from '../../validation.service';
@Injectable({ providedIn: 'root' })

export class RootAttributesFactoryService implements IAttributeFactory {

  constructor(private validationService: ValidationService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {

    const validators: IAttributeValidators = this.getAttributeValidators(attributeName, parserValidation);

    const attribute = AttributeData.Root;

    switch (attributeName) {
      case attribute.Top.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Top, value, parserValidation);
      case attribute.Distinct.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Distinct, value, parserValidation  );
      case attribute.Aggregate.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Aggregate, value, parserValidation);
      case attribute.TotalRecordsCount.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.TotalRecordsCount, value, parserValidation);
      case attribute.RecordsPerPage.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.RecordsPerPage, value, parserValidation);
      case attribute.Page.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Page, value, parserValidation);
      case attribute.PagingCookie.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.PagingCookie, value, parserValidation);
      case attribute.LateMaterialize.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.LateMaterialize, value, parserValidation);
      case attribute.DataSource.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.DataSource, value, parserValidation);
      case attribute.Options.EditorName:
        return new NodeAttribute(this.validationService, node, validators, attribute.Options, value, parserValidation);
      default:
        return new NodeAttribute(this.validationService, node, validators, { Order: 99, EditorName: attributeName }, value, parserValidation);
    }
  }


  private getAttributeValidators(attributeName: string, parserValidation: boolean): IAttributeValidators {
    let parsingSyncValidators: IAttributeOneTimeValidator[] = [];
    let parsingAsyncValidators: IAttributeValidator[] = [];
    if (parserValidation) {
      parsingAsyncValidators = this.getParserAsyncValidators(attributeName);
    }

    return { validators: this.getDefaultAsyncValidators(attributeName), oneTimeValidators: parsingSyncValidators };
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
        return []
      case AttributeNames.rootDistinct:
        return []
      case AttributeNames.rootAggregate:
        return []
      case AttributeNames.rootTotalRecordsCount:
        return []
      case AttributeNames.rootLateMaterialize:
        return []
      case AttributeNames.rootTotalRecordsCount:
        return []
      case AttributeNames.rootPage:
        return []
      default:
        return []
    }
  }
}