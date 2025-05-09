// TreePanelComponent - Added to fix component declaration issue
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';

import { QueryNodeTree } from 'src/app/components/query-builder/models/query-node-tree';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { NodeTreeService } from '../services/node-tree.service';
import { QueryNode } from '../models/query-node';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'app-tree-panel',
  templateUrl: './tree-panel.component.html',
  styleUrls: ['./tree-panel.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
      CommonModule,
      MatIconModule,
      MatTooltipModule
  ],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
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

removeNode(node: QueryNode) {
  this.nodeTreeProcessor.removeNode(node)
}

getNodeIcon(node: QueryNode) {
  if (node.tagName === 'fetch' || node.tagName === 'value') {
    return false
  }

  return true;
}
}
