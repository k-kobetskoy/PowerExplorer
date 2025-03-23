// TreePanelComponent - Added to fix component declaration issue
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';

import { QueryNodeTree } from 'src/app/components/query-builder/models/query-node-tree';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { NodeTreeService } from '../services/node-tree.service';
import { QueryNode } from '../models/query-node';

@Component({
  selector: 'app-tree-panel',
  templateUrl: './tree-panel.component.html',
  styleUrls: ['./tree-panel.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class TreePanelComponent implements OnInit {

  dataSource$: Observable<QueryNodeTree>
  selectedNode$: Observable<QueryNode>

  constructor(
    private eventBus: EventBusService,
    private nodeTreeProcessor: NodeTreeService) { }

  ngOnInit() {
    this.dataSource$ = this.nodeTreeProcessor.getNodeTree()
    this.selectedNode$ = this.nodeTreeProcessor.selectedNode$    
  }

  selectNode(node: QueryNode) {
    this.nodeTreeProcessor.selectedNode$ = node
  }

  toggleNode(node: QueryNode) {
    this.nodeTreeProcessor.toggleNode(node)
  }
}
