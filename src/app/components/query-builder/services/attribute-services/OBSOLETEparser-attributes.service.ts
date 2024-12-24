import { AllowedNodeAttributeService } from './OBSOLETEallowed-node-attribute.service';
import { Injectable } from '@angular/core';
import { NodeAttribute } from '../../models/node-attribute';
import { AttributeFactoryResorlverService } from './attribute-factory-resorlver.service';
import { IQueryNode } from '../../models/abstract/OBSOLETE i-query-node';
import { IAttributeValidator } from './abstract/i-attribute-validator';
import { IAttributesService } from './abstract/i-attributes-service';

@Injectable({ providedIn: 'root' })

export class ParserAttributesService  {

  // constructor(
  //   private factoryResolver: AttributeFactoryResorlverService,
  //   private allowedNodeAttributeService: AllowedNodeAttributeService
  // ) { }

  // getAttribute(node: IQueryNode, attributeName: string, attributeValue?: string): NodeAttribute {

  //   const attribute = new NodeAttribute(node, attributeName, attributeValue);

  //   const attributeNameIsValid = this.validateAttributeName(attributeName, node.name);

  //   attribute.validators = attributeNameIsValid ? this.getValidators(attributeName, node.name) : [];
  //   attribute.isValidName = attributeNameIsValid;

  //   return attribute;
  // }
  
  // private validateAttributeName(attributeName: string, nodeName: string) : boolean {
  //   const allowedAttributeNames = this.allowedNodeAttributeService.getAllowedNodeAttributes(nodeName);

  //   return allowedAttributeNames.includes(attributeName);
  // }

  // private getValidators(attributeName: string, nodeName: string): IAttributeValidator[] {
  //   const validatorsFactory = this.factoryResolver.getAttributesFactory(nodeName);

  //   if (validatorsFactory) {
  //     validatorsFactory.getDefaultAsyncValidators(attributeName);
  //   }

  //   return validatorsFactory === null ? [] : validatorsFactory.getDefaultAsyncValidators(attributeName);
  // }
}
