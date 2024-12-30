import { Component, Input, OnInit } from '@angular/core';
import { NodeTreeService } from '../../../services/node-tree.service';
import { QueryNode } from '../../../models/query-node';

@Component({
  selector: 'app-quick-actions',
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.css']
})
export class QuickActionsComponent implements OnInit {

  @Input() selectedNode: QueryNode

  constructor(private nodeTreeProcessor: NodeTreeService) { }

  ngOnInit() { }

  addNode(nodeName: string) {
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
