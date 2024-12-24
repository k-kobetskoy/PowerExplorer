import { NodeTreeProcessorService } from './../services/node-tree-processor.service';
import { Component, OnInit } from '@angular/core';
import { IQueryNode } from '../models/abstract/OBSOLETE i-query-node';
import { Observable } from 'rxjs';
import { QueryNodeType } from '../models/constants/OBSOLETE query-node-type';

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.css']
})
export class ControlPanelComponent implements OnInit {

  selectedNode$: Observable<IQueryNode>
  nodeTypes = QueryNodeType

  constructor(private nodeTreeProcessorService: NodeTreeProcessorService) {
    this.selectedNode$ = this.nodeTreeProcessorService.selectedNode$
  }

  ngOnInit() { }
}