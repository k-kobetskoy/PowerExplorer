import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { QueryNodeTree } from '../models/query-node-tree';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { QueryNode } from '../models/query-node';
import { QueryNodeData } from '../models/constants/query-node-data';
import { ValueAttributeData } from '../models/constants/attribute-data';
import { NodeFactoryService } from './attribute-services/node-factory.service';
import { ValidationResult, ValidationService } from './validation.service';
@Injectable({ providedIn: 'root' })
export class NodeTreeService {

  private _nodeTree$: BehaviorSubject<QueryNodeTree> = new BehaviorSubject<QueryNodeTree>(null);

  xmlRequest$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  private _selectedNode$: BehaviorSubject<QueryNode> = new BehaviorSubject<QueryNode>(null);

  validationResult$: Observable<ValidationResult>;

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
    private validationService: ValidationService,
  ) {
    
    this.initializeNodeTree();
    
    this._eventBus.on(AppEvents.ENVIRONMENT_CHANGED, () => this.initializeNodeTree());

    this.validationResult$ = this.validationService.setupNodeTreeValidation(this._nodeTree$);    
  }

  getNodeTree(): BehaviorSubject<QueryNodeTree> {
    if (this._nodeTree$.value) {
      return this._nodeTree$;
    }

    this.initializeNodeTree();

    return this._nodeTree$;
  }

  initializeNodeTree() {
    if(this._nodeTree$.value) {
      return;
    }

    const nodeTree = new QueryNodeTree();

    const rootNode = this.nodeFactory.createNode(QueryNodeData.Fetch.NodeName, false, null);

    nodeTree.root = rootNode;

    this._nodeTree$.next(nodeTree);

    this._selectedNode$.next(rootNode);

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

    return newNode;
  }

  addNode(newNodeName: string): QueryNode {
    console.log('Node Tree Service - Adding new node with name:', newNodeName);
    
    // Map "Link" action to "Link Entity" node name
    if (newNodeName === 'Link') {
      newNodeName = 'Link Entity';
      console.log('Mapped "Link" action to "Link Entity" node name');
    }
    
    let parentNode = this._selectedNode$.value;

    let newNode = this.nodeFactory.createNode(newNodeName, false, this._nodeTree$.value.root);
    console.log('Node created with nodeName:', newNode.nodeName);

    let nodeAbove = this.getNodeAbove(newNode.order, parentNode);
    let bottomNode = nodeAbove.next;

    nodeAbove.next = newNode;
    newNode.next = bottomNode;

    newNode.level = parentNode.level + 1;
    newNode.parent = parentNode;

    if (parentNode) {
      this.expandNode(this._selectedNode$.value)
    }

    this.selectedNode$ = newNode;
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
    const nodeTree = this._nodeTree$.value;
    if (nodeTree && nodeTree.root) {
      this.cleanupNodeAndChildren(nodeTree.root);
    }
    
    this._nodeTree$.next(null);
    this._selectedNode$.next(null);
  }

  private cleanupNodeAndChildren(node: QueryNode): void {
    if (!node) return;

    const nextNode = node.next;

    node.dispose();

    if (nextNode && nextNode.level > node.level) {
      this.cleanupNodeAndChildren(nextNode);
    }

    this._nodeTree$.value.destroyed$.next();
    this._nodeTree$.value.destroyed$.complete();
  }
}
