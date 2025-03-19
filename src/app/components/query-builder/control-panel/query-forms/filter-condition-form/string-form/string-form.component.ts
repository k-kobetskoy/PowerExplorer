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
  // Add multi-value control for comma-separated values
  multiValueControl = new FormControl('');

  readonly filterOperators = FilterStaticData.FilterStringOperators;

  constructor(private multiValueNodesService: MultiValueNodesService) { 
    super(); 
  }

  protected override initializeForm() {
    super.initializeForm();
    
    // Subscribe to operator changes for wildcard info
    this.setupWildcardInfo();
    
    // Set up multi-value binding
    this.setupMultiValueBinding();
    
    // Load existing multi-values if present
    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      this.loadExistingMultiValues();
    }
  }
  
  private setupWildcardInfo() {
    // Add the wildcard info subscription
    this.operatorFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.showWildcardInfo$.next(['like', 'not-like'].includes(value.toLowerCase()));
        }
      });
  }
  
  private setupMultiValueBinding() {
    // We no longer process value changes immediately - only on blur/enter
    
    // Listen to operator changes to handle switching between single and multi-value
    this.operatorFormControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (this.isMultiValueOperator(value)) {
          console.log('String form: Switched to multi-value operator:', value);
          this.handleMultiValueOperator();
        } else {
          this.ensureValueAttribute();
        }
      });
  }
  
  private loadExistingMultiValues() {
    console.log('String form: Loading existing multi-values for node:', this.selectedNode);
    const currentValues = this.multiValueNodesService.getMultiValueString(this.selectedNode);
    console.log('String form: Current multi-values:', currentValues);
    
    if (this.multiValueControl.value !== currentValues) {
      this.multiValueControl.setValue(currentValues, { emitEvent: false });
    }
  }
  
  protected override handleMultiValueOperator() {
    console.log('String form: Handling multi-value operator');
    
    // Remove single value attribute
    this.selectedNode.removeAttribute(AttributeNames.conditionValue);
    
    // Ensure the multi-value input is in sync with existing value nodes
    this.loadExistingMultiValues();
  }

  // Handle input blur event
  onMultiValueBlur(): void {
    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      console.log('String form: Multi-value input blur - processing values:', this.multiValueControl.value);
      this.processMultiValues();
    }
  }

  // Handle Enter key press
  onMultiValueEnter(event: Event): void {
    event.preventDefault();
    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      console.log('String form: Multi-value input Enter key - processing values:', this.multiValueControl.value);
      this.processMultiValues();
    }
  }

  // Process the multi-values
  private processMultiValues(): void {
    this.multiValueNodesService.processMultiValues(this.selectedNode, this.multiValueControl.value);
    
    // Refresh the value after processing to ensure consistent UI state
    setTimeout(() => {
      this.loadExistingMultiValues();
    }, 100);
  }
}
