import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { NodeTreeService } from '../../../services/node-tree.service';
import { QueryNode } from '../../../models/query-node';

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
  
  resetTree() {
    throw new Error('Method not implemented.');
  }
  duplicateNode() {
    throw new Error('Method not implemented.');
  }
  deleteNode() {
    this.nodeTreeProcessor.removeNode(this.selectedNode);
  }
}
