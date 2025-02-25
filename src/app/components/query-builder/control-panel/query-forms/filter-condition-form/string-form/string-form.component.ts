import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../../base-form.component';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { QueryNode } from '../../../../models/query-node';

@Component({
  selector: 'app-string-form',
  templateUrl: './string-form.component.html',
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

    .hint-text {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 4px;
    }

    .wildcard-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .wildcard-info mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class StringFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { operator: string, value: string }>();

  operatorFormControl = new FormControl('');
  valueFormControl = new FormControl('');
  loading$ = new BehaviorSubject<boolean>(false);
  errorMessage$ = new BehaviorSubject<string>('');
  showWildcardInfo$ = new BehaviorSubject<boolean>(false);

  readonly filterOperators = FilterStaticData.FilterStringOperators;

  @Input() attributeValue: string;
  @Input() override selectedNode: QueryNode;

  constructor() {
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
    this.setupNodeValueHandling();
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

          // Show wildcard info for 'Like' and 'Not Like' operators
          this.showWildcardInfo$.next(['like', 'not-like'].includes(value.toLowerCase()));
        }
      });

    this.valueFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          // Validate string length
          if (value && value.length > 2000) {
            this.errorMessage$.next('String value cannot exceed 2000 characters');
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
