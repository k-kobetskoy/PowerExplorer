import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { BooleanModel } from 'src/app/models/incoming/boolean/boolean-model';
import { BooleanEntityService } from '../../../../services/entity-services/boolean-entity.service';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { BaseFormComponent } from '../../base-form.component';

@Component({
  selector: 'app-boolean-form',
  templateUrl: './boolean-form.component.html',
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
  `]
})
export class BooleanFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { operator: string, value: string }>();

  operatorFormControl = new FormControl('');
  valueFormControl = new FormControl('');
  booleanOptions$: Observable<BooleanModel>;
  loading$ = new BehaviorSubject<boolean>(false);

  readonly filterOperators = FilterStaticData.FilterBooleanOperators;

  @Input() attributeValue: string;

  constructor(private booleanService: BooleanEntityService) {
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
    this.setupBooleanOptions();
    this.setupNodeValueHandling();
  }

  private setupBooleanOptions() {
    const entityName = this.selectedNode.getParentEntityName().value;
    const attributeName = this.attributeValue;
    if (entityName && attributeName) {
      this.loading$.next(true);
      this.booleanOptions$ = this.booleanService.getBooleanValues(entityName, attributeName);
      this.loading$.next(false);
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
