import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, switchMap, takeUntil, finalize } from 'rxjs/operators';
import { BooleanModel } from 'src/app/models/incoming/boolean/boolean-model';
import { BooleanEntityService } from '../../../../services/entity-services/boolean-entity.service';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { BaseFormComponent } from '../../base-form.component';

@Component({
  selector: 'app-boolean-form',
  templateUrl: './boolean-form.component.html',
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
  `]
})
export class BooleanFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { operator: string, value: string }>();

  booleanForm: FormGroup;
  booleanOptions$: Observable<BooleanModel>;

  readonly filterOperators = FilterStaticData.FilterBooleanOperators;

  @Input() attributeValue: string;

  constructor(
    private booleanService: BooleanEntityService,
    private fb: FormBuilder
  ) {
    super();
  }

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
    this.createFormGroup();
    this.setupBooleanOptions();
    this.setupNodeValueHandling();
  }

  private createFormGroup() {
    this.booleanForm = this.fb.group({
      operator: [''],
      value: ['']
    });
  }

  private setupBooleanOptions() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      this.booleanOptions$ = of(<BooleanModel>{});
      return;
    }

    const parentEntityName$ = this.selectedNode.getParentEntityName(parentEntityNode)
      .pipe(distinctUntilChanged());

    this.booleanOptions$ = parentEntityName$.pipe(
      switchMap(entityName => {
        if (!entityName || entityName.trim() === '') {
          return of(<BooleanModel>{});
        }

        return parentEntityNode.validationPassed$.pipe(
          switchMap(isValid => {
            if (!isValid) {
              return of(<BooleanModel>{});
            }
            
            const attributeName = this.attributeValue;
            if (!attributeName) {
              return of(<BooleanModel>{});
            }
            
            return this.booleanService.getBooleanValues(entityName, attributeName);
          })
        );
      })
    );
  }

  private setupNodeValueHandling() {
    const nodeId = this.selectedNode.id;
    if (this.storedValues.has(nodeId)) {
      const values = this.storedValues.get(nodeId);
      this.booleanForm.patchValue({
        operator: values.operator,
        value: values.value
      }, { emitEvent: false });
    } else {
      const operator = this.getAttributeValue(AttributeData.Condition.Operator);
      const value = this.getAttributeValue(AttributeData.Condition.Value);

      this.booleanForm.patchValue({
        operator: operator || '',
        value: value || ''
      }, { emitEvent: false });

      this.storedValues.set(nodeId, {
        operator: operator || '',
        value: value || ''
      });
    }

    this.booleanForm.get('operator').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.storedValues.set(this.selectedNode.id, {
            ...this.storedValues.get(this.selectedNode.id),
            operator: value
          });
          this.updateAttribute(AttributeData.Condition.Operator, value);
        }
      });

    this.booleanForm.get('value').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.storedValues.set(this.selectedNode.id, {
            ...this.storedValues.get(this.selectedNode.id),
            value: value
          });
          this.updateAttribute(AttributeData.Condition.Value, value);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
