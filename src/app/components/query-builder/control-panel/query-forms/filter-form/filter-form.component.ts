import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  filterForm: FormGroup;
  
  readonly filterTypeOptions = FilterStaticData.FilterTypes;

  constructor(private fb: FormBuilder) {
    super();
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedNode'] && this.selectedNode) {
      // Clean up existing subscriptions
      this.destroy$.next();
      
      // Reinitialize the form
      this.initializeForm();
    }
  }

  private initializeForm() {
    // Create form group with controls for each attribute
    this.filterForm = this.fb.group({
      type: [this.getAttributeValue(this.AttributeData.Filter.Type)],
      isquickfindfields: [this.getAttributeValue(this.AttributeData.Filter.IsQuickFind) === 'true'],
      overridequickfindrecordlimitenabled: [this.getAttributeValue(this.AttributeData.Filter.OverrideRecordLimit) === 'true'],
      overridequickfindrecordlimitdisabled: [this.getAttributeValue(this.AttributeData.Filter.BypassQuickFind) === 'true']
    });
    
    // Subscribe to form value changes
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(formValues => {
        // Only update attributes that have changed
        Object.entries(formValues).forEach(([key, value]) => {
          // Convert boolean values to string
          const stringValue = value !== null && value !== undefined 
            ? (typeof value === 'boolean' ? value.toString() : String(value))
            : '';
          
          // Find the corresponding attribute
          const attribute = Object.values(this.AttributeData.Filter)
            .find(attr => attr.EditorName === key);
          
          if (attribute) {
            // Only update if the value has changed
            const currentValue = this.getAttributeValue(attribute);
            if (currentValue !== stringValue) {
              this.updateAttribute(attribute, stringValue);
            }
          }
        });
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
