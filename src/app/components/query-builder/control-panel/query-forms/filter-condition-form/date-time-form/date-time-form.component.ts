import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';

@Component({
  selector: 'app-date-time-form',
  templateUrl: './date-time-form.component.html',
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
export class DateTimeFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { operator: string, value: string }>();

  dateTimeForm: FormGroup;

  readonly filterOperators = FilterStaticData.FilterDateTimeOperators;

  @Input() attributeValue: string;

  constructor(private fb: FormBuilder) {
    super();
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedNode'] && this.selectedNode) {
      this.destroy$.next();
      this.initializeForm();
    }
  }

  private initializeForm() {
    this.createFormGroup();
    this.setupNodeValueHandling();
  }

  private createFormGroup() {
    this.dateTimeForm = this.fb.group({
      operator: [''],
      value: ['']
    });
  }

  private setupNodeValueHandling() {
    // When node changes, load its stored value or attribute value
    const nodeId = this.selectedNode.id;
    if (this.storedValues.has(nodeId)) {
      const values = this.storedValues.get(nodeId);
      this.dateTimeForm.patchValue({
        operator: values.operator,
        value: values.value
      }, { emitEvent: false });
    } else {
      const operator = this.getAttributeValue(AttributeData.Condition.Operator);
      const value = this.getAttributeValue(AttributeData.Condition.Value);
      
      this.dateTimeForm.patchValue({
        operator: operator || '',
        value: value || ''
      }, { emitEvent: false });
      
      this.storedValues.set(nodeId, { 
        operator: operator || '', 
        value: value || '' 
      });
    }

    // Subscribe to form control changes
    this.dateTimeForm.get('operator').valueChanges
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

    this.dateTimeForm.get('value').valueChanges
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
