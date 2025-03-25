// TreePanelComponent - Added to fix component declaration issue
import { Component, OnInit, ViewEncapsulation, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TUI_ICON_RESOLVER, TuiIcon } from '@taiga-ui/core';

import { QueryNodeTree } from 'src/app/components/query-builder/models/query-node-tree';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { NodeTreeService } from '../services/node-tree.service';
import { QueryNode } from '../models/query-node';
import { NodeStyleDirective } from 'src/app/directives/node-style.directive';
import { iconResolver } from 'src/app/app.module';

@Component({
  selector: 'app-tree-panel',
  templateUrl: './tree-panel.component.html',
  styleUrls: ['./tree-panel.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TuiIcon
  ],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: TUI_ICON_RESOLVER,
      useFactory: iconResolver
    }
  ]
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

  getNodeIcon(node: QueryNode) {
    if (node.tagName === 'fetch' || node.tagName === 'value') {
      return false
    }

    return true;
  }
}
