import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from '../../../../services/multi-value-nodes.service';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';

@Component({
  selector: 'app-multi-value-form',
  templateUrl: './multi-value-form.component.html',
  styleUrls: ['./multi-value-form.component.css']
})
export class MultiValueFormComponent extends OperatorValueBaseFormComponent implements OnInit, OnDestroy {
  multiValueControl = new FormControl('');
  operatorType$ = new BehaviorSubject<string>('');
  
  // Default to string operators, will be overridden by child components
  filterOperators = FilterStaticData.FilterStringOperators;
  
  constructor(private multiValueNodesService: MultiValueNodesService) {
    super();
  }
  
  override ngOnInit() {
    super.ngOnInit();
    this.setupMultiValueInput();
  }
  
  protected override initializeForm() {
    super.initializeForm();
    
    // Load existing multi-values if present
    this.loadExistingMultiValues();
  }
  
  private setupMultiValueInput() {
    // Handle operator changes
    this.operatorFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.operatorType$.next(value);
          
          if (this.isMultiValueOperator(value)) {
            // For multi-value operators, clear value attribute and load value nodes
            this.handleMultiValueOperator();
          }
        }
      });
    
    // We no longer process value changes immediately - only on blur/enter
  }
  
  // Handle input blur event
  onMultiValueBlur(): void {
    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      console.log('Multi-value input blur - processing values:', this.multiValueControl.value);
      this.processMultiValues();
    }
  }
  
  // Handle Enter key press
  onMultiValueEnter(event: Event): void {
    event.preventDefault();
    if (this.isMultiValueOperator(this.operatorFormControl.value)) {
      console.log('Multi-value input Enter key - processing values:', this.multiValueControl.value);
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
  
  private loadExistingMultiValues() {
    console.log('Loading existing multi-values for node:', this.selectedNode);
    const currentValues = this.multiValueNodesService.getMultiValueString(this.selectedNode);
    console.log('Current multi-values:', currentValues);
    
    if (this.multiValueControl.value !== currentValues) {
      this.multiValueControl.setValue(currentValues, { emitEvent: false });
    }
  }
  
  protected override handleMultiValueOperator() {
    super.handleMultiValueOperator();
    
    // Ensure the multi-value input is in sync with existing value nodes
    this.loadExistingMultiValues();
  }
  
  protected override handleMultiValueInput(inputValue: string) {
    // No longer automatically process inputs - wait for blur/Enter
  }
  
  override ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 