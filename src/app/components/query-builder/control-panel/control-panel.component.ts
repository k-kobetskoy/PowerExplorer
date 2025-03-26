// ControlPanelComponent - Added to fix component declaration issue
import { NodeTreeService } from '../services/node-tree.service';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { QueryNodeData } from '../models/constants/query-node-data';
import { QueryNode } from '../models/query-node';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EntityFormComponent } from './query-forms/entity-form/entity-form.component';
import { FilterConditionFormComponent } from './query-forms/filter-condition-form/filter-condition-form.component';
import { FilterFormComponent } from './query-forms/filter-form/filter-form.component';
import { OrderFormComponent } from './query-forms/order-form/order-form.component';
import { LinkEntityFormComponent } from './query-forms/link-entity-form/link-entity-form.component';
import { AttributeFormComponent } from './query-forms/attribute-form/attribute-form.component';
import { ValueFormComponent } from './query-forms/value-form/value-form.component';
import { RootFormComponent } from './query-forms/root-form/root-form.component';


@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    EntityFormComponent,
    RootFormComponent,
    AttributeFormComponent,
    FilterFormComponent,
    FilterConditionFormComponent,
    LinkEntityFormComponent,
    OrderFormComponent,
    ValueFormComponent
  ],
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