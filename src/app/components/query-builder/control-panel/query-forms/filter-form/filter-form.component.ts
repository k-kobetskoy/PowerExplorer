import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, Input } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../models/constants/ui/filter-static-data';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

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

  @Input() selectedNode: QueryNode;

  filterTypeFormControl = new FormControl('');
  isQuickFindFieldsFormControl = new FormControl(false);
  overrideQuickFindRecordLimitEnabledFormControl = new FormControl(false);
  overrideQuickFindRecordLimitDisabledFormControl = new FormControl(false);

  readonly filterTypeOptions = FilterStaticData.FilterTypes;

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

  setupFormToModelBindings() {
    this.filterTypeFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Filter.Type, this.selectedNode, value);
      });

    this.isQuickFindFieldsFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Filter.IsQuickFind, this.selectedNode, value.toString());
      });

    this.overrideQuickFindRecordLimitEnabledFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Filter.OverrideRecordLimit, this.selectedNode, value.toString());
      });

    this.overrideQuickFindRecordLimitDisabledFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Filter.BypassQuickFind, this.selectedNode, value.toString());
      });
  }

  private setInitialValues() {
    const type = this.getAttribute(AttributeData.Filter.Type, this.selectedNode);  
    const isQuickFind = this.getAttribute(AttributeData.Filter.IsQuickFind, this.selectedNode);
    const overrideQuickFindRecordLimitEnabled = this.getAttribute(AttributeData.Filter.OverrideRecordLimit, this.selectedNode);
    const overrideQuickFindRecordLimitDisabled = this.getAttribute(AttributeData.Filter.BypassQuickFind, this.selectedNode);

    if (type) {
      this.filterTypeFormControl.setValue(type.value$.value, { emitEvent: false });
    }

    if (isQuickFind) {
      this.isQuickFindFieldsFormControl.setValue(isQuickFind.value$.value === 'true', { emitEvent: false });
    }

    if (overrideQuickFindRecordLimitEnabled) {
      this.overrideQuickFindRecordLimitEnabledFormControl.setValue(overrideQuickFindRecordLimitEnabled.value$.value === 'true', { emitEvent: false });
    }
    
    if (overrideQuickFindRecordLimitDisabled) {
      this.overrideQuickFindRecordLimitDisabledFormControl.setValue(overrideQuickFindRecordLimitDisabled.value$.value === 'true', { emitEvent: false });
    }
  }

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
}
