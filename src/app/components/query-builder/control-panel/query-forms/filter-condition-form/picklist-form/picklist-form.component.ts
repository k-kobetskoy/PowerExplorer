import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../../base-form.component';
import { FormControl } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { QueryNode } from '../../../../models/query-node';
import { PicklistEntityService } from '../../../../services/entity-services/picklist-entity.service';
import { PicklistModel } from 'src/app/models/incoming/picklist/picklist-model';
import { AttributeType } from '../../../../models/constants/dataverse/attribute-types';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';

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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PicklistFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  readonly filterOperators = FilterStaticData.FilterPickListOperators;
  picklistOptions$: Observable<PicklistModel[]>;

  @Input() attributeValue: string;
  @Input() selectedNode: QueryNode;

  operatorFormControl = new FormControl('');
  valueFormControl = new FormControl('');


  constructor(private picklistService: PicklistEntityService) { super(); }

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

    this.setupPicklistOptions();
  }

  setupFormToModelBindings() {
    this.operatorFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Condition.Operator, this.selectedNode, value);
      });

    this.valueFormControl.valueChanges  
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateAttribute(AttributeData.Condition.Value, this.selectedNode, value);
      });
  }
  
  setInitialValues() {
    const operator = this.getAttribute(AttributeData.Condition.Operator, this.selectedNode);
    const value = this.getAttribute(AttributeData.Condition.Value, this.selectedNode);

    if (operator) {
      this.operatorFormControl.setValue(operator.value$.value, { emitEvent: false });
    }
    if (value) {
      this.valueFormControl.setValue(value.value$.value, { emitEvent: false });
    }    
  }


  private setupPicklistOptions() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      this.picklistOptions$ = of([]);
      return;
    }

    this.picklistOptions$ = parentEntityNode.validationResult$.pipe(
      distinctUntilChanged((prev, curr) => prev.isValid === curr.isValid),
      takeUntil(this.destroy$),
      switchMap(validationResult => {
        if (validationResult.isValid) {
          return parentEntityNode.attributes$.pipe(
            distinctUntilChanged((prev, curr) => prev.length === curr.length),
            switchMap(attributes => {
              const attribute = attributes.find(attr => attr.editorName === AttributeNames.entityName);
              
              if (attribute) {
                return this.picklistService.getOptions(attribute.editorName, this.attributeValue, AttributeType.PICKLIST);
              }
              return of([]);
            })
          );
        }
        return of([]);
      })
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
