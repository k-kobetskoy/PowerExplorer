// ControlPanelComponent - Added to fix component declaration issue
import { NodeTreeService } from '../services/node-tree.service';
import { Component, OnInit, NO_ERRORS_SCHEMA, OnDestroy } from '@angular/core';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { QueryNodeData } from '../models/constants/query-node-data';
import { QueryNode } from '../models/query-node';

// Import all form components
import { EntityFormComponent } from './query-forms/entity-form/entity-form.component';
import { AttributeFormComponent } from './query-forms/attribute-form/attribute-form.component';
import { FilterFormComponent } from './query-forms/filter-form/filter-form.component';
import { FilterConditionFormComponent } from './query-forms/filter-condition-form/filter-condition-form.component';
import { LinkEntityFormComponent } from './query-forms/link-entity-form/link-entity-form.component';
import { OrderFormComponent } from './query-forms/order-form/order-form.component';
import { QuickActionsComponent } from './query-forms/quick-actions/quick-actions.component';
import { RootFormComponent } from './query-forms/root-form/root-form.component';
import { ValueFormComponent } from './query-forms/value-form/value-form.component';

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    EntityFormComponent,
    AttributeFormComponent,
    FilterFormComponent,
    FilterConditionFormComponent,
    LinkEntityFormComponent,
    OrderFormComponent,
    QuickActionsComponent,
    RootFormComponent,
    ValueFormComponent
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ControlPanelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  selectedNode$: Observable<QueryNode>;
  nodeTypes = QueryNodeData;

  constructor(private nodeTreeProcessorService: NodeTreeService) {
    this.selectedNode$ = this.nodeTreeProcessorService.selectedNode$;
  }

  ngOnInit() {}
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}