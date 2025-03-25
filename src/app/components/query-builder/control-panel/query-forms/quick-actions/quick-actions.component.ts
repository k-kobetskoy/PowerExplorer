import { Component, Input, OnInit, ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeTreeService } from '../../../services/node-tree.service';
import { QueryNode } from '../../../models/query-node';
import { AttributeData, EntityAttributeData } from '../../../models/constants/attribute-data';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { QueryNodeData } from '../../../models/constants/query-node-data';

// Taiga UI imports
import { TUI_ICON_RESOLVER } from '@taiga-ui/core';
import { iconResolver } from 'src/app/app.module';

@Component({
  standalone: true,
  selector: 'app-quick-actions',
  templateUrl: './quick-actions.component.html',
  styles: [`
    .node-editor-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background-color: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .tree-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 0.5rem;
    }

    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule
  ],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: TUI_ICON_RESOLVER,
      useFactory: iconResolver
    }
  ]
})
export class QuickActionsComponent implements OnInit {

  @Input() selectedNode: QueryNode

  constructor(private nodeTreeProcessor: NodeTreeService) { }

  ngOnInit() { }

  addNode(nodeName: string) {
    console.log('Quick actions - Adding node with name:', nodeName);
    this.nodeTreeProcessor.addNode(nodeName);
  }
  
  getNodeActions(): string[] {
    if(this.selectedNode.tagName === QueryNodeData.Fetch.TagName && this.selectedNode.next?.nodeName === QueryNodeData.Entity.NodeName) {
      return []
    }
    else return this.selectedNode.actions;
  }

  deleteNode() {
    this.nodeTreeProcessor.removeNode(this.selectedNode);
  }
}
