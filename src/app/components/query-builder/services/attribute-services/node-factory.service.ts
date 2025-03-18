import { ConditionAttributesFactoryService } from './attribute-factories/condition-attributes-factory.service';
import { Injectable } from '@angular/core';
import { RootAttributesFactoryService } from './attribute-factories/root-attributes-factory.service';
import { EntityAttributesFacoryService } from './attribute-factories/entity-attributes-facory.service';
import { IAttributeFactory } from './abstract/i-attribute-validators-factory';
import { AttributeAttributesFactoryService } from './attribute-factories/attribute-attributes-factory.service';
import { FilterAttributesFactoryService } from './attribute-factories/filter-attributes-factory.service';
import { LinkAttributesFactoryService } from './attribute-factories/link-attributes-factory.service';
import { OrderAttributesFactoryService } from './attribute-factories/order-attributes-factory.service';
import { INodeData, QueryNodeData } from '../../models/constants/query-node-data';
import { DefaultAttributesFactoryService } from './attribute-factories/default-attributes-factory.service';
import { QueryNode } from '../../models/query-node';
import { ValidationService } from '../../services/validation.service';
import { Observable,  switchMap, of, combineLatest, map, takeUntil } from 'rxjs';
import { INodeValidators } from './abstract/i-node-validators';
import { EntityNodeRequiredNameValidatorService } from './validators/nodes/entity-node-required-name-validator.service';
import { INodeValidator } from './abstract/i-node-validator';
import { NodeNameValidatorService } from './validators/nodes/one-time-validatiors/node-name-validator.service';
import { INodeOneTimeValidator } from './abstract/i-node-one-time-validator';
import { AttributeNodeAggregateRequiredAliasValidatorService } from './validators/nodes/attribute-node-aggregate-required-alias-validator.service';
import { AttributeNodeRequiredNameValidatorService } from './validators/nodes/attribute-node-required-name-validator.service';
import { EntityNameServerValidatorService } from './validators/attributes/entity-name-server-validator.service';
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
    private defaultFactory: DefaultAttributesFactoryService,
    private validationService: ValidationService,
    private entityNodeNameValidator: EntityNodeRequiredNameValidatorService,
    private entityNameServerValidator: EntityNameServerValidatorService,
    private nodeNameValidator: NodeNameValidatorService,
    private attributeNodeAggregateRequiredAliasValidator: AttributeNodeAggregateRequiredAliasValidatorService,
    private attributeNodeRequiredNameValidator: AttributeNodeRequiredNameValidatorService,
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
      case QueryNodeData.Fetch.Name:
        return this.rootFactory
      default:
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
      switchMap(attributes => {
        if (attributes.length === 0) {
          return of(node.nodeName);
        }

        const displayableAttributes = attributes.filter(attr =>
          attr.attributeDisplayValues.displayOnTreeView
        );

        if (displayableAttributes.length === 0) {
          return of(node.nodeName);
        }

        const displayValues$ = displayableAttributes.map(attr =>
          attr.attributeDisplayValues.treeViewDisplayValue$
        );

        return combineLatest(displayValues$).pipe(
          map(values => `${node.nodeName} ${values.join(' ')}`),
          takeUntil(node.destroyed$)
        );
      }),
      takeUntil(node.destroyed$)
      //TODO: check if needed
      //shareReplay(1)         
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
    if(QueryNodeData.NodesNames.includes(nodeName)) {
      return [this.nodeNameValidator];
    }

    return [];
  }

  private getValidators(nodeName: string): INodeValidator[] {
    switch (nodeName) {
      case QueryNodeData.Entity.Name:
        return [this.entityNodeNameValidator];
      case QueryNodeData.Attribute.Name:
        return [this.attributeNodeRequiredNameValidator, this.attributeNodeAggregateRequiredAliasValidator];
      default:
        return [];
    }
  }
}
