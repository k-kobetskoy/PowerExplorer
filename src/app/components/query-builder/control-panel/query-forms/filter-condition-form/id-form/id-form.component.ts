import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../../base-form.component';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { QueryNode } from 'src/app/components/query-builder/models/query-node';

@Component({
  selector: 'app-id-form',
  templateUrl: './id-form.component.html',
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IdFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  readonly filterOperators = FilterStaticData.FilterIdOperators;

  @Input() attributeValue: string;
  @Input() selectedNode: QueryNode;

  operatorFormControl = new FormControl('');
  valueFormControl = new FormControl('');

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
    this.setInitialValues();

    this.setupFormToModelBindings();
  }

  private setInitialValues() {
    const operator = this.getAttribute(AttributeData.Condition.Operator, this.selectedNode);
    const value = this.getAttribute(AttributeData.Condition.Value, this.selectedNode);

    if (operator) {
      this.operatorFormControl.setValue(operator.value$.value, { emitEvent: false });
    }
    if (value) {
      this.valueFormControl.setValue(value.value$.value, { emitEvent: false });
    }
  }

  private setupFormToModelBindings() {
    this.operatorFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Condition.Operator, this.selectedNode, value);
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
