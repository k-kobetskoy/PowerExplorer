import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NodeTreeService } from '../../../services/node-tree.service';
import { QueryNode } from '../../../models/query-node';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'app-node-actions',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule, 
    MatTooltipModule
  ],
  templateUrl: './node-actions.component.html',
  styleUrls: ['./node-actions.component.css']
})
export class NodeActionsComponent {
  @Input() selectedNode: QueryNode;

  constructor(
    private nodeTreeProcessorService: NodeTreeService
  ) {}

  duplicateNode() {
    this.nodeTreeProcessorService.addNode(this.selectedNode.nodeName, this.selectedNode.parent);
  }

  removeNode() {
    this.nodeTreeProcessorService.removeNode(this.selectedNode);
  }
}
