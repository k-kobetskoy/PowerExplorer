import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { QueryNodeTree } from '../models/query-node-tree';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { QueryNode } from '../models/query-node';
import { QueryNodeData } from '../models/constants/query-node-data';
import { AttributeFactoryResorlverService } from './attribute-services/attribute-factory-resorlver.service';

@Injectable({ providedIn: 'root' })

export class NodeTreeService {

  private _nodeTree$: BehaviorSubject<QueryNodeTree> = new BehaviorSubject<QueryNodeTree>(null);

  xmlRequest$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  private _selectedNode$: BehaviorSubject<QueryNode> = new BehaviorSubject<QueryNode>(null);

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
    this._eventBus.on(AppEvents.ENVIRONMENT_CHANGED, () => this.initializeNodeTree())
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

  clearNodeTree() {
    this._nodeTree$.next(null);
    this._selectedNode$.next(null);
  }

  addNodeFromParsing(newNodeName: string): QueryNode {
    console.log(`Adding node from parsing: ${newNodeName}`);
    
    let newNode = new QueryNode(newNodeName, this.attributeFactoryResolver);
    
    // Handle null tree
    if (!this._nodeTree$.value) {
      
      if(newNodeName != QueryNodeData.Root.Name){
        console.error(`First node must be ${QueryNodeData.Root.Name}`);
        return null;
      }

      const nodeTree = new QueryNodeTree();

      nodeTree.root = newNode;

      this._nodeTree$.next(nodeTree);
      this._selectedNode$.next(newNode);
      return newNode;
    }
    
    let parentNode = this._selectedNode$.value;

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

    // // Ensure proper parent-child relationships based on node level
    // // XML parsing should maintain proper nesting by selecting the appropriate parent
    // if (parentNode) {
    //   // Find the correct parent based on the node level
    //   let currentLevel = parentNode.level;
      
    //   // If we're going deeper in the XML hierarchy
    //   if (newNode.level > parentNode.level) {
    //     // This is a child of the current node
    //     console.log(`Node ${newNodeName} is a child of ${parentNode.nodeName}`);
    //   } 
    //   // If we're at the same level in the XML hierarchy
    //   else if (newNode.level === parentNode.level) {
    //     // This is a sibling of the current node, so get its parent
    //     parentNode = parentNode.parent;
    //     console.log(`Node ${newNodeName} is a sibling of current node, parent: ${parentNode?.nodeName || 'none'}`);
    //   }
    //   // If we're going up in the XML hierarchy
    //   else {
    //     // Find the ancestor at the appropriate level
    //     while (parentNode && parentNode.level >= newNode.level) {
    //       parentNode = parentNode.parent;
    //     }
    //     console.log(`Node ${newNodeName} is at a higher level, parent: ${parentNode?.nodeName || 'none'}`);
    //   }
    // }
    
    // // If we still have no parent after all our logic, use the root node as parent
    // if (!parentNode && this._nodeTree$.value.root) {
    //   parentNode = this._nodeTree$.value.root;
    //   console.log(`No parent found - defaulting to root node: ${parentNode.nodeName}`);
    // }
    
    // // Handle node insertion
    // if (parentNode) {
    //   // Add it to the tree normally
    //   let nodeAbove = this.getNodeAbove(newNode.order, parentNode);
    //   let bottomNode = nodeAbove.next;
  
    //   nodeAbove.next = newNode;
    //   newNode.next = bottomNode;
  
    //   // Set the level and parent based on the XML structure
    //   newNode.level = parentNode.level + 1;
    //   newNode.parent = parentNode;
    //   console.log(`Set node ${newNodeName} level to ${newNode.level} with parent ${parentNode.nodeName}`);
      
    //   this.expandNode(parentNode);
    // } else {
    //   // If we somehow still have no parent, make this a root-level node
    //   console.log(`WARNING: No parent found for ${newNodeName}, adding as root-level node`);
    //   newNode.level = 0;
      
    //   if (this._nodeTree$.value.root) {
    //     // Add after the root
    //     const root = this._nodeTree$.value.root;
    //     newNode.next = root.next;
    //     root.next = newNode;
    //   } else {
    //     // Make this the root if there is none
    //     this._nodeTree$.value.root = newNode;
    //   }
    // }

    // this._selectedNode$.next(newNode);
    // console.log(`Selected node is now: ${newNode.nodeName}`);
    
    return newNode;
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
      // Add a condition node and make it the selected node
      const conditionNode = this.addNode(QueryNodeData.Condition.Name);
      this.selectedNode$ = conditionNode;
    }

    return newNode;
  }

  getNodeAbove(newNodeOrder: number, parentNode: QueryNode): QueryNode {
    // Safety check - if parent is null/undefined, we can't find a node above
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
      // Return the parent node as a fallback
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
