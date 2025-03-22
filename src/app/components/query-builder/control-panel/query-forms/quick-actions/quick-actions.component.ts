import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { NodeTreeService } from '../../../services/node-tree.service';
import { QueryNode } from '../../../models/query-node';
import { AttributeData, EntityAttributeData } from '../../../models/constants/attribute-data';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { QueryNodeData } from '../../../models/constants/query-node-data';

@Component({
  selector: 'app-quick-actions',
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
