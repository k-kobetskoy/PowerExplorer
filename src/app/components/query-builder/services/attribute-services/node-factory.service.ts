import { ConditionAttributesFactoryService } from './attribute-factories/condition-attributes-factory.service';
import { Injectable } from '@angular/core';
import { RootAttributesFactoryService } from './attribute-factories/root-attributes-factory.service';
import { EntityAttributesFacoryService } from './attribute-factories/entity-attributes-facory.service';
import { IAttributeFactory } from './abstract/i-attribute-validators-factory';
import { AttributeAttributesFactoryService } from './attribute-factories/attribute-attributes-factory.service';
import { FilterAttributesFactoryService } from './attribute-factories/filter-attributes-factory.service';
import { LinkAttributesFactoryService } from './attribute-factories/link-attributes-factory.service';
import { OrderAttributesFactoryService } from './attribute-factories/order-attributes-factory.service';
import { ValueAttributesFactoryService } from './attribute-factories/value-attributes-factory.service';
import { INodeData, QueryNodeData } from '../../models/constants/query-node-data';
import { DefaultAttributesFactoryService } from './attribute-factories/default-attributes-factory.service';
import { QueryNode } from '../../models/query-node';
import { ValidationService } from '../../services/validation.service';
import { Observable, switchMap, of, combineLatest, map, takeUntil, distinctUntilChanged } from 'rxjs';
import { INodeValidators } from './abstract/i-node-validators';
import { EntityNodeRequiredNameValidatorService } from './validators/nodes/entity-node-required-name-validator.service';
import { INodeValidator } from './abstract/i-node-validator';
import { NodeNameValidatorService } from './validators/nodes/one-time-validatiors/node-name-validator.service';
import { INodeOneTimeValidator } from './abstract/i-node-one-time-validator';
import { AttributeNodeAggregateRequiredAliasValidatorService } from './validators/nodes/attribute-node-aggregate-required-alias-validator.service';
import { AttributeNodeRequiredNameValidatorService } from './validators/nodes/attribute-node-required-name-validator.service';

@Injectable({ providedIn: 'root' })

export class NodeFactoryService {

  constructor(
    private rootFactory: RootAttributesFactoryService,
    private entityFactory: EntityAttributesFacoryService,
    private conditionFactory: ConditionAttributesFactoryService,
    private attributeFactory: AttributeAttributesFactoryService,
    private filterFactory: FilterAttributesFactoryService,
    private linkFactory: LinkAttributesFactoryService,
    private orderFactory: OrderAttributesFactoryService,
    private valueFactory: ValueAttributesFactoryService,
    private defaultFactory: DefaultAttributesFactoryService,
    private validationService: ValidationService,
    private entityNodeNameValidator: EntityNodeRequiredNameValidatorService,
    private nodeNameValidator: NodeNameValidatorService,
    private attributeNodeAggregateRequiredAliasValidator: AttributeNodeAggregateRequiredAliasValidatorService,
    private attributeNodeRequiredNameValidator: AttributeNodeRequiredNameValidatorService,
  ) { }

  getAttributesFactory(nodeName: string): IAttributeFactory {

    switch (nodeName) {
      case QueryNodeData.Condition.NodeName:
        return this.conditionFactory
      case QueryNodeData.Attribute.NodeName:
        return this.attributeFactory
      case QueryNodeData.Filter.NodeName:
        return this.filterFactory
      case QueryNodeData.Entity.NodeName:
        return this.entityFactory
      case QueryNodeData.Link.NodeName:
        return this.linkFactory
      case QueryNodeData.Order.NodeName:
        return this.orderFactory
      case QueryNodeData.Fetch.NodeName:
        return this.rootFactory
      case QueryNodeData.Value.NodeName:
        return this.valueFactory
      default:
        console.warn(`No specific factory found for node name: ${nodeName}, using default factory`);
        return this.defaultFactory
    }
  }

  createNode(nodeName: string, oneTimeParserValidation: boolean = false, rootNode: QueryNode): QueryNode {
    const nodeData: INodeData = QueryNodeData.getNodeData(nodeName);

    const attributeFactory = this.getAttributesFactory(nodeName);

    const nodeValidators = this.getNodeValidators(nodeName, oneTimeParserValidation);

    const node = new QueryNode(nodeData, attributeFactory, nodeValidators, rootNode);

    node.nodeDisplayValue$ = this.createNodeDisplayValueObservable(node);

    node.validationResult$ = this.validationService.setupNodeValidation(node);

    return node;
  }


  private createNodeDisplayValueObservable(node: QueryNode): Observable<string> {
    return node.attributes$.pipe(
      map(attributes => {
        // When no attributes exist, return node name
        if (attributes.length === 0) {
          return node.nodeName;
        }

        const displayableAttributes = attributes.filter(attr =>
          attr.attributeDisplayValues.displayOnTreeView
        );

        // When no displayable attributes exist, return node name
        if (displayableAttributes.length === 0) {
          return node.nodeName;
        }

        // When we have displayable attributes, return their combined display values
        const displayValues$ = displayableAttributes.map(attr =>
          attr.attributeDisplayValues.treeViewDisplayValue$
        );

        // Return an observable that will emit the combined display values
        return combineLatest(displayValues$).pipe(
          map(values => values.join(' ')),
          distinctUntilChanged(),
          switchMap(combinedValue => 
            combinedValue ? of(combinedValue) : of(node.nodeName)
          )
        );
      }),
      distinctUntilChanged(),
      switchMap(valueOrObservable => 
        typeof valueOrObservable === 'string' 
          ? of(valueOrObservable) 
          : valueOrObservable
      ),
      map(value => value || node.nodeName),
      takeUntil(node.destroyed$)
    );
  }

  private getNodeValidators(nodeName: string, oneTimeParserValidation: boolean): INodeValidators {

  let oneTimeValidators: INodeOneTimeValidator[] = [];
  let validators: INodeValidator[] = [];

  if (oneTimeParserValidation) {
    oneTimeValidators = this.getOneTimeValidators(nodeName);
  }

  validators = this.getValidators(nodeName);

  return {
    oneTimeValidators: oneTimeValidators,
    validators: validators
  };
}

  private getOneTimeValidators(nodeName: string): INodeOneTimeValidator[] {
  if (QueryNodeData.NodesNames.includes(nodeName)) {
    return [this.nodeNameValidator];
  }

  return [];
}

  private getValidators(nodeName: string): INodeValidator[] {
  switch (nodeName) {
    case QueryNodeData.Entity.NodeName:
      return [this.entityNodeNameValidator];
    case QueryNodeData.Attribute.NodeName:
      return [this.attributeNodeRequiredNameValidator, this.attributeNodeAggregateRequiredAliasValidator];
    default:
      return [];
  }
}
}
