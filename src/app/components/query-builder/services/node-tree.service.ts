import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { QueryNodeTree } from '../models/query-node-tree';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { QueryNode } from '../models/query-node';
import { QueryNodeData } from '../models/constants/query-node-data';
import { AttributeFactoryResorlverService } from './attribute-services/attribute-factory-resorlver.service';

export const XML_EVENTS = {
  ADD_XML_NODE: 'ADD_XML_NODE',
  INITIALIZE_NODE_TREE: 'INITIALIZE_NODE_TREE',
  CHECK_PROGRAMMATIC_UPDATE: 'CHECK_PROGRAMMATIC_UPDATE',
  SET_PROGRAMMATIC_UPDATE: 'SET_PROGRAMMATIC_UPDATE'
};

@Injectable({ providedIn: 'root' })
export class NodeTreeService {

  private _nodeTree$: BehaviorSubject<QueryNodeTree> = new BehaviorSubject<QueryNodeTree>(null);

  xmlRequest$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  private _selectedNode$: BehaviorSubject<QueryNode> = new BehaviorSubject<QueryNode>(null);
  
  // Keep track of programmatic updates locally
  private isProgrammaticUpdate: boolean = false;

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
    private attributeFactoryResolver: AttributeFactoryResorlverService
  ) {
    this.initializeNodeTree();
    
    // Listen for XML parsing events
    this._eventBus.on(XML_EVENTS.ADD_XML_NODE, (nodeName) => {
      if (nodeName) {
        this.addNode(nodeName);
      }
    });
    
    this._eventBus.on(XML_EVENTS.INITIALIZE_NODE_TREE, () => {
      this.initializeNodeTree();
    });
    
    // Listen for programmatic update state changes
    this._eventBus.on(XML_EVENTS.SET_PROGRAMMATIC_UPDATE, (value) => {
      this.isProgrammaticUpdate = !!value;
    });
    
    // Respond to requests for programmatic update state
    this._eventBus.on(XML_EVENTS.CHECK_PROGRAMMATIC_UPDATE, () => {
      this._eventBus.emit({ 
        name: XML_EVENTS.SET_PROGRAMMATIC_UPDATE,
        value: this.isProgrammaticUpdate
      });
    });
    
    this._eventBus.on(AppEvents.ENVIRONMENT_CHANGED, () => this.initializeNodeTree());
  }

  getNodeTree(): BehaviorSubject<QueryNodeTree> {
    if (this._nodeTree$.value) {
      return this._nodeTree$;
    }

    this.initializeNodeTree();

    return this._nodeTree$;
  }

  initializeNodeTree() {
    const nodeTree = new QueryNodeTree();

    const rootNode = new QueryNode(QueryNodeData.Root.Name, this.attributeFactoryResolver);

    nodeTree.root = rootNode;

    this._nodeTree$.next(nodeTree);

    this._selectedNode$.next(rootNode);

    this.addNode(QueryNodeData.Entity.Name);
  }

  addNode(newNodeName: string): QueryNode {
    let parentNode = this._selectedNode$.value;  

    let newNode = new QueryNode(newNodeName, this.attributeFactoryResolver);

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

    // Handle special node types that require additional nodes
    if(newNodeName === QueryNodeData.Filter.Name) {
      // Only automatically add Condition node if not in a programmatic update
      // This prevents chain reactions during XML parsing
      if (!this.isProgrammaticUpdate) {
        // Add a condition node and make it the selected node
        const conditionNode = this.addNode(QueryNodeData.Condition.Name);
        this.selectedNode$ = conditionNode;
      }
    }

    return newNode;
  }

  getNodeAbove(newNodeOrder: number, parentNode: QueryNode): QueryNode {
    let current = parentNode;
    let newNodeLevel = current.level + 1;

    while (current) {
      if (!current.next) { break }
      if (current.next.order > newNodeOrder && current.next.level === newNodeLevel) { break }
      if (current.next.level <= parentNode.level) { break }
      current = current.next;
    }
    return current;
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

    previousNode.next = nextNode;

    if (nextNode) {
      previousNode.expandable = previousNode.level < previousNode.next.level;
    } else {
      previousNode.expandable = false;
    }

    this._selectedNode$.next(previousNode);
    this._eventBus.emit({ name: AppEvents.NODE_REMOVED })
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
}
