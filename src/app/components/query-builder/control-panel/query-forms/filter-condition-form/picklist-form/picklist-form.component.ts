import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, map, switchMap, takeUntil, finalize } from 'rxjs/operators';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { QueryNode } from '../../../../models/query-node';
import { PicklistEntityService } from '../../../../services/entity-services/picklist-entity.service';
import { PicklistModel } from 'src/app/models/incoming/picklist/picklist-model';
import { AttributeTypes } from '../../../../models/constants/dataverse/attribute-types';

@Component({
  selector: 'app-picklist-form',
  templateUrl: './picklist-form.component.html',
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

    .option-label {
      font-weight: 500;
    }

    .option-value {
      font-size: 0.85em;
      color: rgba(0, 0, 0, 0.6);
    }

    .error-message {
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
    }
  `]
})
export class PicklistFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { operator: string, value: string }>();

  picklistForm: FormGroup;
  errorMessage$ = new BehaviorSubject<string>('');

  readonly filterOperators = FilterStaticData.FilterPickListOperators;
  picklistOptions$: Observable<PicklistModel[]>;

  @Input() attributeValue: string;
  @Input() override selectedNode: QueryNode;

  constructor(
    private picklistService: PicklistEntityService,
    private fb: FormBuilder
  ) {
    super();
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedNode || changes.attributeValue) {
      this.destroy$.next();      
      this.initializeForm();
    }
  }

  private initializeForm() {
    this.createFormGroup();
    this.setupPicklistOptions();
    this.setupNodeValueHandling();
  }

  private createFormGroup() {
    this.picklistForm = this.fb.group({
      operator: [''],
      value: ['']
    });
  }

  private setupPicklistOptions() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      this.picklistOptions$ = of([]);
      return;
    }

    const parentEntityName$ = this.selectedNode.getParentEntityName(parentEntityNode)
      .pipe(distinctUntilChanged());

    this.picklistOptions$ = parentEntityName$.pipe(
      switchMap(entityName => {
        if (!entityName || entityName.trim() === '') {
          return of([]);
        }

        return parentEntityNode.validationPassed$.pipe(
          switchMap(isValid => {
            if (!isValid) {
              return of([]);
            }
            
            const attributeName = this.attributeValue;
            if (!attributeName) {
              return of([]);
            }
            
            this.errorMessage$.next('');
            
            return this.picklistService.getOptions(entityName, attributeName, AttributeTypes.PICKLIST);              
          })
        );
      })
    );
  }

  private setupNodeValueHandling() {
    const nodeId = this.selectedNode.id;
    if (this.storedValues.has(nodeId)) {
      const values = this.storedValues.get(nodeId);
      this.picklistForm.patchValue({
        operator: values.operator,
        value: values.value
      }, { emitEvent: false });
    } else {
      const operator = this.getAttributeValue(AttributeData.Condition.Operator);
      const value = this.getAttributeValue(AttributeData.Condition.Value);
      
      this.picklistForm.patchValue({
        operator: operator || '',
        value: value || ''
      }, { emitEvent: false });
      
      this.storedValues.set(nodeId, { 
        operator: operator || '', 
        value: value || '' 
      });
    }

    this.picklistForm.get('operator').valueChanges
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

    this.picklistForm.get('value').valueChanges
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
