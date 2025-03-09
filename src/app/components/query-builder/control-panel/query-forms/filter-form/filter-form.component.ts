import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  filterForm: FormGroup;

  readonly filterTypeOptions = FilterStaticData.FilterTypes;

  constructor(private fb: FormBuilder) { super(); }

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
    // Create form with existing attribute values
    this.filterForm = this.fb.group({
      type: [this.getAttributeValue(this.AttributeData.Filter.Type)],
      isquickfindfields: [this.getAttributeValue(this.AttributeData.Filter.IsQuickFind) === 'true'],
      overridequickfindrecordlimitenabled: [this.getAttributeValue(this.AttributeData.Filter.OverrideRecordLimit) === 'true'],
      overridequickfindrecordlimitdisabled: [this.getAttributeValue(this.AttributeData.Filter.BypassQuickFind) === 'true']
    });

    this.setupFormChangeHandlers();
  }

  private setupFormChangeHandlers() {
    // Handle type attribute changes
    this.filterForm.get('type').valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        const currentValue = this.getAttributeValue(this.AttributeData.Filter.Type);
        
        if (currentValue !== stringValue) {
          console.debug(`Updating filter type from '${currentValue}' to '${stringValue}'`);
          this.updateAttribute(this.AttributeData.Filter.Type, stringValue);
        }
      });

    // Handle isquickfindfields attribute changes
    this.filterForm.get('isquickfindfields').valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        const stringValue = value !== null && value !== undefined ? value.toString() : 'false';
        const currentValue = this.getAttributeValue(this.AttributeData.Filter.IsQuickFind);
        
        if (currentValue !== stringValue) {
          console.debug(`Updating filter isquickfindfields from '${currentValue}' to '${stringValue}'`);
          this.updateAttribute(this.AttributeData.Filter.IsQuickFind, stringValue);
        }
      });

    // Handle overridequickfindrecordlimitenabled attribute changes
    this.filterForm.get('overridequickfindrecordlimitenabled').valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        const stringValue = value !== null && value !== undefined ? value.toString() : 'false';
        const currentValue = this.getAttributeValue(this.AttributeData.Filter.OverrideRecordLimit);
        
        if (currentValue !== stringValue) {
          console.debug(`Updating filter overridequickfindrecordlimitenabled from '${currentValue}' to '${stringValue}'`);
          this.updateAttribute(this.AttributeData.Filter.OverrideRecordLimit, stringValue);
        }
      });

    // Handle overridequickfindrecordlimitdisabled attribute changes
    this.filterForm.get('overridequickfindrecordlimitdisabled').valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        const stringValue = value !== null && value !== undefined ? value.toString() : 'false';
        const currentValue = this.getAttributeValue(this.AttributeData.Filter.BypassQuickFind);
        
        if (currentValue !== stringValue) {
          console.debug(`Updating filter overridequickfindrecordlimitdisabled from '${currentValue}' to '${stringValue}'`);
          this.updateAttribute(this.AttributeData.Filter.BypassQuickFind, stringValue);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
