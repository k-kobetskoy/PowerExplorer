import { ConditionAttributesFactoryService } from './attribute-factories/condition-attributes-factory.service';
import { Injectable } from '@angular/core';
import { RootAttributesFactoryService } from './attribute-factories/root-attributes-factory.service';
import { EntityAttributesFacoryService } from './attribute-factories/entity-attributes-facory.service';
import { IAttributeFactory } from './abstract/i-attribute-validators-factory';
import { AttributeAttributesFactoryService } from './attribute-factories/attribute-attributes-factory.service';
import { FilterAttributesFactoryService } from './attribute-factories/filter-attributes-factory.service';
import { LinkAttributesFactoryService } from './attribute-factories/link-attributes-factory.service';
import { OrderAttributesFactoryService } from './attribute-factories/order-attributes-factory.service';
import { QueryNodeData } from '../../models/constants/query-node-data';
import { DefaultAttributesFactoryService } from './attribute-factories/default-attributes-factory.service';

@Injectable({ providedIn: 'root' })

export class AttributeFactoryResorlverService {

  constructor(
    private rootFactory: RootAttributesFactoryService,
    private entityFactory: EntityAttributesFacoryService,
    private conditionFactory: ConditionAttributesFactoryService,
    private attributeFactory: AttributeAttributesFactoryService,
    private filterFactory: FilterAttributesFactoryService,
    private linkFactory: LinkAttributesFactoryService,
    private orderFactory: OrderAttributesFactoryService,
    private defaultFactory: DefaultAttributesFactoryService
  ) { }

  getAttributesFactory(tagName: string): IAttributeFactory {
    switch (tagName) {
      case QueryNodeData.Condition.Name:
        return this.conditionFactory
      case QueryNodeData.Attribute.Name:
        return this.attributeFactory
      case QueryNodeData.Filter.Name:
        return this.filterFactory
      case QueryNodeData.Entity.Name:
        return this.entityFactory
      case QueryNodeData.Link.Name:
        return this.linkFactory
      case QueryNodeData.Order.Name:
        return this.orderFactory
      case QueryNodeData.Root.Name:
        return this.rootFactory
      default:
        return this.defaultFactory
    }
  }
}
