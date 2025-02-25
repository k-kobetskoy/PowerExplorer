import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../models/constants/ui/filter-static-data';

@Component({
  selector: 'app-filter-form',
  templateUrl: './filter-form.component.html',
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-field {
      width: 100%;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `]
})
export class FilterFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  
  filterTypeControl = new FormControl('');
  isQuickFindControl = new FormControl(false);
  overrideRecordLimitControl = new FormControl(false);
  bypassQuickFindControl = new FormControl(false);

  readonly filterTypeOptions = FilterStaticData.FilterTypes;

  constructor() {
    super();
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedNode) {
      // Clean up existing subscriptions
      this.destroy$.next();
      
      // Reinitialize the form
      this.initializeForm();
    }
  }

  private initializeForm() {
    // Initialize values from node attributes
    this.filterTypeControl.setValue(this.getAttributeValue(this.AttributeData.Filter.Type));
    this.isQuickFindControl.setValue(this.getAttributeValue(this.AttributeData.Filter.IsQuickFind) === 'true');
    this.overrideRecordLimitControl.setValue(this.getAttributeValue(this.AttributeData.Filter.OverrideRecordLimit) === 'true');
    this.bypassQuickFindControl.setValue(this.getAttributeValue(this.AttributeData.Filter.BypassQuickFind) === 'true');

    // Subscribe to changes
    this.filterTypeControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Filter.Type, value));

    this.isQuickFindControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Filter.IsQuickFind, value.toString()));

    this.overrideRecordLimitControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Filter.OverrideRecordLimit, value.toString()));

    this.bypassQuickFindControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Filter.BypassQuickFind, value.toString()));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
