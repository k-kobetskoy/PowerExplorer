import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { QueryNodeTree } from '../models/query-node-tree';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { QueryNode } from '../models/query-node';
import { QueryNodeData } from '../models/constants/query-node-data';
import { ValueAttributeData } from '../models/constants/attribute-data';
import { NodeFactoryService } from './attribute-services/node-factory.service';
import { VALID_RESULT, ValidationResult, ValidationService } from './validation.service';
import { AttributeNames } from '../models/constants/attribute-names';
import { tap, shareReplay } from 'rxjs/operators';
@Injectable({ providedIn: 'root' })
export class NodeTreeService {
  private _nodeTree$: BehaviorSubject<QueryNodeTree> = new BehaviorSubject<QueryNodeTree>(null);

  xmlRequest$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  private _selectedNode$: BehaviorSubject<QueryNode> = new BehaviorSubject<QueryNode>(null);

  validationResult$: Observable<ValidationResult>;

  // Track validation subscription for cleanup
  private validationSubscription: Subscription = null;

  public get selectedNode$(): Observable<QueryNode> {
    return this._selectedNode$.asObservable();
  }

  public set selectedNode$(value: QueryNode) {
    if (value != this._selectedNode$.value) {
      this._selectedNode$.next(value);
    }
  }

  constructor(
    private _eventBus: EventBusService,
    private nodeFactory: NodeFactoryService,
    private validationService: ValidationService
  ) {
    this.initializeNodeTree();

    this._eventBus.on(AppEvents.ENVIRONMENT_CHANGED, () => this.initializeNodeTree());

    this.setupValidation();
  }

  public setupValidation() {
    console.log('Setting up node tree validation');

    // Clean up any existing subscription
    if (this.validationSubscription) {
      this.validationSubscription.unsubscribe();
      this.validationSubscription = null;
    }

    // Create a new validation observable with shareReplay to ensure all subscribers get the same values
    this.validationResult$ = this.validationService.setupNodeTreeValidation(this._nodeTree$)
      .pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );

    // Subscribe to validation to keep it active even if the UI doesn't subscribe yet
    this.validationSubscription = this.validationResult$.subscribe();
  }

  getNodeTree(): BehaviorSubject<QueryNodeTree> {
    if (this._nodeTree$.value) {
      return this._nodeTree$;
    }

    this.initializeNodeTree();

    this.setupValidation();

    return this._nodeTree$;
  }

  initializeNodeTree() {
    if (this._nodeTree$.value) {
      return;
    }

    const nodeTree = new QueryNodeTree();

    const rootNode = this.nodeFactory.createNode(QueryNodeData.Fetch.NodeName, false, null);

    nodeTree.root = rootNode;

    this._nodeTree$.next(nodeTree);

    this._selectedNode$.next(rootNode);

    const attributeFactory = this.nodeFactory.getAttributesFactory(rootNode.nodeName);

    rootNode.addAttribute(attributeFactory.createAttribute(AttributeNames.rootTop, rootNode, false, '10'));

    this.addNode(QueryNodeData.Entity.NodeName);
  }

  addNodeFromParsing(newNodeName: string, parentNode: QueryNode = null): QueryNode {

    const rootNode = this._nodeTree$.value?.root;

    let newNode = this.nodeFactory.createNode(newNodeName, true, rootNode);

    if (!this._nodeTree$.value) {
      const nodeTree = new QueryNodeTree();

      nodeTree.root = newNode;

      this._nodeTree$.next(nodeTree);
      this._selectedNode$.next(newNode);

      // First-time setup of the validation is still needed
      //this.setupValidation();

      return newNode;
    }

    if (!parentNode) {
      parentNode = this._selectedNode$.value;
    }

    let nodeAbove = this.getNodeAbove(newNode.order, parentNode);
    let bottomNode = nodeAbove.next;

    nodeAbove.next = newNode;
    newNode.next = bottomNode;

    newNode.level = parentNode.level + 1;
    newNode.parent = parentNode;

    if (parentNode) {
      this.expandNode(parentNode);
    }
    this.selectedNode$ = newNode;

    // Explicitly emit from nodeTree$ to ensure validation is triggered
    this._nodeTree$.next(this._nodeTree$.value);

    return newNode;
  }

  addNode(newNodeName: string, parent: QueryNode = null): QueryNode {
    // Map "Link" action to "Link Entity" node name
    if (newNodeName === 'Link') {
      newNodeName = 'Link Entity';
    }

    let parentNode = parent || this._selectedNode$.value;

    let newNode = this.nodeFactory.createNode(newNodeName, false, this._nodeTree$.value.root);

    let nodeAbove = this.getNodeAbove(newNode.order, parentNode);
    let bottomNode = nodeAbove.next;

    nodeAbove.next = newNode;
    newNode.next = bottomNode;

    newNode.level = parentNode.level + 1;
    newNode.parent = parentNode;


    if (parent) {
      this.expandNode(parentNode);
    } else {
      this.expandNode(this._selectedNode$.value)
    }

    this.selectedNode$ = newNode;

    // Explicitly emit from nodeTree$ to ensure validation is triggered
    this._nodeTree$.next(this._nodeTree$.value);

    this._eventBus.emit({ name: AppEvents.NODE_ADDED });

    if (newNodeName === QueryNodeData.Filter.NodeName) {
      const conditionNode = this.addNode(QueryNodeData.Condition.NodeName);
      this.selectedNode$ = conditionNode;
    }

    return newNode;
  }

  addValueNode(parentConditionNode: QueryNode, value: string = ''): QueryNode {
    const valueNode = this.nodeFactory.createNode(QueryNodeData.Value.NodeName, false, this._nodeTree$.value.root);

    let nodeAbove = this.getNodeAbove(valueNode.order, parentConditionNode);
    let bottomNode = nodeAbove.next;

    nodeAbove.next = valueNode;
    valueNode.next = bottomNode;

    valueNode.level = parentConditionNode.level + 1;
    valueNode.parent = parentConditionNode;

    if (value) {
      const attributeFactory = this.nodeFactory.getAttributesFactory(QueryNodeData.Value.NodeName);
      const textAttribute = attributeFactory.createAttribute(
        ValueAttributeData.InnerText.EditorName,
        valueNode,
        false,
        value
      );
      valueNode.addAttribute(textAttribute);
    }

    this.expandNode(parentConditionNode);
    this._eventBus.emit({ name: AppEvents.NODE_ADDED });

    this._nodeTree$.next(this._nodeTree$.value);

    return valueNode;
  }

  getNodeAbove(newNodeOrder: number, parentNode: QueryNode): QueryNode {
    if (!parentNode) {
      console.error("getNodeAbove called with null/undefined parentNode");
      return null;
    }

    let current = parentNode;
    let newNodeLevel = current.level + 1;

    try {
      while (current) {
        if (!current.next) { break }
        if (current.next.order > newNodeOrder && current.next.level === newNodeLevel) { break }
        if (current.next.level <= parentNode.level) { break }
        current = current.next;
      }
      return current;
    } catch (error) {
      console.error("Error in getNodeAbove:", error);
      console.error("parentNode:", parentNode);
      console.error("newNodeOrder:", newNodeOrder);

      return parentNode;
    }
  }

  removeNode(node: QueryNode) {
    if (!node.parent) {
      throw new Error('Node has no parent.');
    }

    const previousNode = this.getPreviousNode(node);
    const nextNode = this.getNextNodeWithTheSameLevel(node);

    if (!previousNode) {
      throw new Error('Previous node not found.');
    }

    this.cleanupNodeAndChildren(node);

    previousNode.next = nextNode;

    if (nextNode) {
      previousNode.expandable = previousNode.level < previousNode.next.level;
    } else {
      previousNode.expandable = false;
    }

    this._selectedNode$.next(previousNode);

    // Explicitly emit from nodeTree$ to ensure validation is updated after node removal
    this._nodeTree$.next(this._nodeTree$.value);

    this._eventBus.emit({ name: AppEvents.NODE_REMOVED });
  }

  expandNode(node: QueryNode) {
    node.expandable = true
    if (!node.isExpanded) {
      this.toggleNode(node)
    }
  }

  toggleNode(node: QueryNode) {
    if (!node.expandable) { return; }

    node.isExpanded = !node.isExpanded;

    let parent = node;
    let nextNestedChild = node.next;

    while (nextNestedChild && nextNestedChild.level > parent.level) {
      if (!parent.isExpanded) {
        nextNestedChild.visible = false;
      } else {
        nextNestedChild.visible = nextNestedChild.parent.isExpanded && nextNestedChild.parent.visible;
      }
      nextNestedChild = nextNestedChild.next;
    }

    if (this._selectedNode$ && !this._selectedNode$.value?.visible) {
      this.selectedNode$ = null
    }
  }

  private getNextNodeWithTheSameLevel(node: QueryNode): QueryNode {
    let nextNode = node.next;

    while (nextNode && nextNode.level > node.level) {
      nextNode = nextNode.next;
    }

    return nextNode;
  }

  private getPreviousNode(node: QueryNode): QueryNode {
    const parent = node.parent;

    let previousNode = parent;

    while (previousNode.next !== node) {
      previousNode = previousNode.next;
    }

    return previousNode;
  }

  clearNodeTree() {
    console.log('Clearing node tree and resetting validation');
    const nodeTree = this._nodeTree$.value;

    // Cleanup current validation subscription
    if (this.validationSubscription) {
      this.validationSubscription.unsubscribe();
      this.validationSubscription = null;
    }

    if (nodeTree && nodeTree.root) {
      // First signal that tree is being destroyed to complete any ongoing validations
      nodeTree.destroyed$.next();
      nodeTree.destroyed$.complete();

      // Then clean up all nodes
      this.cleanupNodeAndChildren(nodeTree.root);
    }

    this._nodeTree$.next(null);
    this._selectedNode$.next(null);

    // Don't set up validation here - it will be set up after the new tree is built
  }

  getPrimaryEntityName(): string {
    const rootNode = this._nodeTree$.value.root;

    const entityNode = rootNode.next;

    if (!entityNode) {
      return null;
    }

    const entityNameAttribute = entityNode.attributes$.value.find(attr => attr.editorName === AttributeNames.entityName);

    if (!entityNameAttribute) {
      return null;
    }

    return entityNameAttribute.value$.value;
  }

  getEntityAttributeMap(): EntityAttributeMap {
    const map: EntityAttributeMap = {};
    const rootNode = this._nodeTree$.value.root;

    if (!rootNode) {
      return map;
    }

    
    this.traverseNodeTree(map, rootNode.next, {
      entityAlias: null,
      attributeData: [],
      isPrimaryEntity: true,
      primaryIdAttribute: null
    }, null);

    return map;
  }

  traverseNodeTree(map: EntityAttributeMap, queryNode: QueryNode, entityAttributeData: EntityAttributeData, entityName: string | null) {
    if (!queryNode) {
      if (entityName) {
        map[entityName] = {
          entityAlias: entityAttributeData.entityAlias,
          attributeData: [...entityAttributeData.attributeData],
          isPrimaryEntity: entityAttributeData.isPrimaryEntity,
          primaryIdAttribute: entityAttributeData.primaryIdAttribute
        };
      }
      return;
    }

    
    const nodeIsEntityOrLink = queryNode.tagName === QueryNodeData.Entity.TagName || queryNode.tagName === QueryNodeData.Link.TagName;

    if (nodeIsEntityOrLink) {
      // Save current entity data if we have a valid entity name
      if (entityName !== null) {
        map[entityName] = {
          entityAlias: entityAttributeData.entityAlias,
          attributeData: [...entityAttributeData.attributeData],
          isPrimaryEntity: entityAttributeData.isPrimaryEntity,
          primaryIdAttribute: entityAttributeData.primaryIdAttribute
        };
      }

      // Get attributes from the node
      const attributes = queryNode.attributes$.value;
      
      const entityNameAttribute = attributes.find(attr => attr.editorName === AttributeNames.entityName);

      if (entityNameAttribute) {
        const entityLogicalName = entityNameAttribute.value$.value;

        // Detect primary ID attribute - conventionally it's entitylogicalname + "id"
        // For example, "account" would have primary ID "accountid"
        const primaryIdAttribute = `${entityLogicalName}id`;

        if (!map[entityLogicalName]) {
          const isPrimary = queryNode.tagName === QueryNodeData.Entity.TagName &&
              !entityName && // No previous entity
              !queryNode.parent?.attributes$.value.some(a => a.editorName === AttributeNames.entityAlias); // Not an aliased entity
                    
          map[entityLogicalName] = {
            entityAlias: null,
            attributeData: [],
            // If this is the first entity in traversal, mark it as primary
            isPrimaryEntity: isPrimary,
            primaryIdAttribute: primaryIdAttribute
          };
        }

        const nextEntityAttributeData: EntityAttributeData = {
          entityAlias: null,
          attributeData: [],
          // Carry forward primary entity status if this is a continuation
          isPrimaryEntity: map[entityLogicalName].isPrimaryEntity,
          primaryIdAttribute: primaryIdAttribute
        };

        const entityAliasAttribute = attributes.find(attr => attr.editorName === AttributeNames.entityAlias);
        nextEntityAttributeData.entityAlias = entityAliasAttribute ? entityAliasAttribute.value$.value : null;
        
        this.traverseNodeTree(map, queryNode.next, nextEntityAttributeData, entityLogicalName);
      } else {
        // Continue traversal with current entity context if no entity name found
        this.traverseNodeTree(map, queryNode.next, entityAttributeData, entityName);
      }
    } else if (queryNode.tagName === QueryNodeData.Attribute.TagName) {
      // Handle Attribute nodes
      const attributes = queryNode.attributes$.value;
      
      const attributeLogicalName = attributes.find(attr => attr.editorName === AttributeNames.attributeName)?.value$.value;
      const attributeAlias = attributes.find(attr => attr.editorName === AttributeNames.attributeAlias)?.value$.value;

      if (attributeLogicalName || attributeAlias) {
        entityAttributeData.attributeData.push({
          attributeLogicalName: attributeLogicalName || null,
          alias: attributeAlias || null
        });
      } else {
      }
      
      this.traverseNodeTree(map, queryNode.next, entityAttributeData, entityName);
    } else {
      // For other node types, just continue traversal with current context
      this.traverseNodeTree(map, queryNode.next, entityAttributeData, entityName);
    }
  }

  private cleanupNodeAndChildren(node: QueryNode): void {
    if (!node) return;

    const nextNode = node.next;

    // Properly dispose of the node to clean up all its subscriptions
    node.dispose();

    // Recursively clean up any children nodes
    if (nextNode && nextNode.level > node.level) {
      this.cleanupNodeAndChildren(nextNode);
    }

    // Don't complete the tree's destroyed$ subject here, as it would affect all validation
    // subscriptions. We only want to complete it when the entire tree is being destroyed.
  }

  forceValidationToPass() {
    this._eventBus.emit({ name: AppEvents.XML_PARSED, value: true });
  }
}

interface EntityAttributeMap {
  [entityLogicalName: string]: EntityAttributeData;
}

interface EntityAttributeData {
  entityAlias: string | null;
  attributeData: AttributeData[];
  primaryIdAttribute?: string | null;
  isPrimaryEntity?: boolean;
}

interface AttributeData {
  attributeLogicalName: string | null;
  alias: string | null;
}
