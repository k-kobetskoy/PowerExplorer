import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../../base-form.component';
import { FormControl, FormBuilder } from '@angular/forms';
import { BehaviorSubject, Subject, distinctUntilChanged, takeUntil } from 'rxjs';
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

  operatorFormControl = new FormControl('');
  valueFormControl = new FormControl('');

  showWildcardInfo$ = new BehaviorSubject<boolean>(false);

  readonly filterOperators = FilterStaticData.FilterStringOperators;

  @Input() attributeValue: string;
  @Input() selectedNode: QueryNode;

  constructor() { super(); }

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
    const operator = this.getAttribute(AttributeData.Condition.Operator, this.selectedNode);
    const value = this.getAttribute(AttributeData.Condition.Value, this.selectedNode);

    if (operator) {
      this.operatorFormControl.setValue(operator.value$.value, { emitEvent: false });
    }
    if (value) {
      this.valueFormControl.setValue(value.value$.value, { emitEvent: false });
    }

    // Subscribe to form control changes
    this.operatorFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Condition.Operator, this.selectedNode, value);

        // Show wildcard info for 'Like' and 'Not Like' operators
        this.showWildcardInfo$.next(['like', 'not-like'].includes(value.toLowerCase()));
      });

    this.valueFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Condition.Value, this.selectedNode, value);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
