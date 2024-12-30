import { NodeTreeService } from '../services/node-tree.service';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { QueryNodeData } from '../models/constants/query-node-data';
import { QueryNode } from '../models/query-node';

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.css']
})
export class ControlPanelComponent implements OnInit {

  selectedNode$: Observable<QueryNode>;
  nodeTypes = QueryNodeData;

  constructor(private nodeTreeProcessorService: NodeTreeService) {
    this.selectedNode$ = this.nodeTreeProcessorService.selectedNode$
  }

  ngOnInit() { }
}