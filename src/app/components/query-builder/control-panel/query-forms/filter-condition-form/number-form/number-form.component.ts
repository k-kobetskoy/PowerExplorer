import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { QueryNode } from '../../../../models/query-node';

@Component({
  selector: 'app-number-form',
  templateUrl: './number-form.component.html',
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

    .error-message {
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
    }
  `]
})
export class NumberFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { operator: string, value: string }>();

  numberForm: FormGroup;
  errorMessage$ = new BehaviorSubject<string>('');

  readonly filterOperators = FilterStaticData.FilterNumberOperators;

  @Input() attributeValue: string;
  @Input() override selectedNode: QueryNode;

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
    this.numberForm = this.fb.group({
      operator: [''],
      value: ['']
    });
  }

  private setupNodeValueHandling() {
    // When node changes, load its stored value or attribute value
    const nodeId = this.selectedNode.id;
    if (this.storedValues.has(nodeId)) {
      const values = this.storedValues.get(nodeId);
      this.numberForm.patchValue({
        operator: values.operator,
        value: values.value
      }, { emitEvent: false });
    } else {
      const operator = this.getAttributeValue(AttributeData.Condition.Operator);
      const value = this.getAttributeValue(AttributeData.Condition.Value);
      
      this.numberForm.patchValue({
        operator: operator || '',
        value: value || ''
      }, { emitEvent: false });
      
      this.storedValues.set(nodeId, { 
        operator: operator || '', 
        value: value || '' 
      });
    }

    // Subscribe to form control changes
    this.numberForm.get('operator').valueChanges
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

    this.numberForm.get('value').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          // Validate number input
          if (value && !this.isValidNumber(value)) {
            this.errorMessage$.next('Please enter a valid number');
            return;
          }
          this.errorMessage$.next('');

          this.storedValues.set(this.selectedNode.id, {
            ...this.storedValues.get(this.selectedNode.id),
            value: value
          });
          this.updateAttribute(AttributeData.Condition.Value, value);
        }
      });
  }

  private isValidNumber(value: string): boolean {
    return !isNaN(Number(value)) && isFinite(Number(value));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
