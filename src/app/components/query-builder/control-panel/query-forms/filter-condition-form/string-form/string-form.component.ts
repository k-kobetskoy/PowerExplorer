import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { FormControl } from '@angular/forms';
import { MultiValueNodesService } from '../../../../services/multi-value-nodes.service';
import { distinctUntilChanged } from 'rxjs/operators';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';

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

    .wildcard-info, .hint-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .wildcard-info mat-icon, .hint-info mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StringFormComponent extends OperatorValueBaseFormComponent {
  showWildcardInfo$ = new BehaviorSubject<boolean>(false);
  multiValueControl = new FormControl('');

  readonly filterOperators = FilterStaticData.FilterStringOperators;

  constructor(private multiValueNodesSvc: MultiValueNodesService) {
    super(multiValueNodesSvc);
  }

  protected override initializeForm() {
    super.initializeForm();

    this.setupWildcardInfo();

    this.setupMultiValueBinding();

    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      this.loadExistingMultiValues();
    }
  }

  private setupWildcardInfo() {
    this.operatorFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.showWildcardInfo$.next(['like', 'not-like'].includes(value.toLowerCase()));
        }
      });
  }

  private setupMultiValueBinding() {
    // Listen to operator changes to handle switching between single and multi-value
    this.operatorFormControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (this.isMultiValueOperator(value)) {
          this.multiValueControl.setValue('', { emitEvent: false });
          this.handleMultiValueOperator();
        } else {
          this.ensureValueAttribute();
        }
      });
  }

  private loadExistingMultiValues() {
    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      this.multiValueControl.setValue('', { emitEvent: false });
    }
  }

  protected override handleMultiValueOperator() {
    this.selectedNode.removeAttribute(AttributeNames.conditionValue);
  }

  onMultiValueBlur(): void {
    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      this.processMultiValues();
    }
  }

  onMultiValueEnter(event: Event): void {
    event.preventDefault();
    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      this.processMultiValues();
    }
  }

  private processMultiValues(): void {
    this.multiValueNodesSvc.processMultiValues(this.selectedNode, this.multiValueControl.value);
    this.multiValueControl.setValue('', { emitEvent: false });
  }
}
