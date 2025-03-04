import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';
import { AttributeValidatorRegistryService } from '../attribute-validator-registry.service';
import { NodeAttribute } from '../../../models/node-attribute';
import { QueryNode } from '../../../models/query-node';
import { AttributeTreeViewDisplayStyle } from '../../../models/constants/attribute-tree-view-display-style';

@Injectable({ providedIn: 'root' })

export class DefaultAttributesFactoryService implements IAttributeFactory {

  constructor(private validators: AttributeValidatorRegistryService) { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    return new NodeAttribute(node, null, { Order: 99, EditorName: attributeName, IsValidName: false, TreeViewDisplayStyle: AttributeTreeViewDisplayStyle.onlyValue, TreeViewName: attributeName }, value);
  }
}