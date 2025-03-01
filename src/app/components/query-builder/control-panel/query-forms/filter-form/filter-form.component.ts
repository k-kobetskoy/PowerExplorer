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
    this.filterForm = this.fb.group({
      type: [this.getAttributeValue(this.AttributeData.Filter.Type)],
      isquickfindfields: [this.getAttributeValue(this.AttributeData.Filter.IsQuickFind) === 'true'],
      overridequickfindrecordlimitenabled: [this.getAttributeValue(this.AttributeData.Filter.OverrideRecordLimit) === 'true'],
      overridequickfindrecordlimitdisabled: [this.getAttributeValue(this.AttributeData.Filter.BypassQuickFind) === 'true']
    });

    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(formValues => {
        Object.entries(formValues).forEach(([key, value]) => {
          const stringValue = value !== null && value !== undefined
            ? (typeof value === 'boolean' ? value.toString() : String(value))
            : '';

          const attribute = Object.values(this.AttributeData.Filter)
            .find(attr => attr.EditorName === key);

          if (attribute) {
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
