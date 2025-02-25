import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../../base-form.component';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { QueryNode } from '../../../../models/query-node';
import { PicklistEntityService } from '../../../../services/entity-services/picklist-entity.service';
import { PicklistModel } from 'src/app/models/incoming/picklist/picklist-model';
import { AttributeTypes } from '../../../../models/constants/dataverse/attribute-types';

@Component({
  selector: 'app-picklist-form',
  templateUrl: './picklist-form.component.html',
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-field {
      width: 100%;
    }

    .option-content {
      display: flex;
      flex-direction: column;
      padding: 4px 0;
    }

    .option-label {
      font-weight: 500;
    }

    .option-value {
      font-size: 0.85em;
      color: rgba(0, 0, 0, 0.6);
    }

    .error-message {
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
    }
  `]
})
export class PicklistFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { operator: string, value: string }>();

  operatorFormControl = new FormControl('');
  valueFormControl = new FormControl('');
  loading$ = new BehaviorSubject<boolean>(false);
  errorMessage$ = new BehaviorSubject<string>('');

  readonly filterOperators = FilterStaticData.FilterPickListOperators;
  picklistOptions$: Observable<PicklistModel[]>;

  @Input() attributeValue: string;
  @Input() override selectedNode: QueryNode;

  constructor(private picklistService: PicklistEntityService) {
    super();
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedNode || changes.attributeValue) {
      // Clean up existing subscriptions
      this.destroy$.next();
      
      // Reinitialize the form
      this.initializeForm();
    }
  }

  private initializeForm() {
    this.setupPicklistOptions();
    this.setupNodeValueHandling();
  }

  private setupPicklistOptions() {
    const entityName = this.selectedNode.getParentEntityName().value;
    if (entityName && this.attributeValue) {
      this.loading$.next(true);
      this.picklistOptions$ = this.picklistService.getOptions(entityName, this.attributeValue, AttributeTypes.PICKLIST)
        .pipe(
          map(options => {
            this.loading$.next(false);
            return options;
          })
        );
    }
  }

  private setupNodeValueHandling() {
    // When node changes, load its stored value or attribute value
    const nodeId = this.selectedNode.id;
    if (this.storedValues.has(nodeId)) {
      const values = this.storedValues.get(nodeId);
      this.operatorFormControl.setValue(values.operator, { emitEvent: false });
      this.valueFormControl.setValue(values.value, { emitEvent: false });
    } else {
      const operator = this.getAttributeValue(AttributeData.Condition.Operator);
      const value = this.getAttributeValue(AttributeData.Condition.Value);
      
      if (operator) {
        this.operatorFormControl.setValue(operator, { emitEvent: false });
      }
      if (value) {
        this.valueFormControl.setValue(value, { emitEvent: false });
      }
      
      this.storedValues.set(nodeId, { 
        operator: operator || '', 
        value: value || '' 
      });
    }

    // Subscribe to form control changes
    this.operatorFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.storedValues.set(this.selectedNode.id, {
            ...this.storedValues.get(this.selectedNode.id),
            operator: value
          });
          this.updateAttribute(AttributeData.Condition.Operator, value);
        }
      });

    this.valueFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.storedValues.set(this.selectedNode.id, {
            ...this.storedValues.get(this.selectedNode.id),
            value: value
          });
          this.updateAttribute(AttributeData.Condition.Value, value);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
