import { Injectable } from '@angular/core';
import { IAttributeFactory } from '../abstract/i-attribute-validators-factory';

import { NodeAttribute } from '../../../models/node-attribute';
import { QueryNode } from '../../../models/query-node';
import { AttributeTreeViewDisplayStyle } from '../../../models/constants/attribute-tree-view-display-style';

@Injectable({ providedIn: 'root' })

export class DefaultAttributesFactoryService implements IAttributeFactory {

  constructor() { }

  createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute {
    return new NodeAttribute(node, null, { Order: 99, EditorName: attributeName, TreeViewDisplayStyle: AttributeTreeViewDisplayStyle.onlyValue, TreeViewName: attributeName }, value, parserValidation);
  }
}