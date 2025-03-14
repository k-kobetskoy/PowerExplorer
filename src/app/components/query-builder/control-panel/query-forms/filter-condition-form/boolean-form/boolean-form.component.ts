import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { BooleanModel } from 'src/app/models/incoming/boolean/boolean-model';
import { BooleanEntityService } from '../../../../services/entity-services/boolean-entity.service';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { AttributeData } from '../../../../models/constants/attribute-data';
import { BaseFormComponent } from '../../base-form.component';
import { QueryNode } from 'src/app/components/query-builder/models/query-node';

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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BooleanFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  booleanOptions$: Observable<BooleanModel>;

  operatorFormControl = new FormControl('');
  valueFormControl = new FormControl('');

  readonly filterOperators = FilterStaticData.FilterBooleanOperators;

  @Input() attributeValue: string;
  @Input() selectedNode: QueryNode;

  constructor(
    private booleanService: BooleanEntityService) { super(); }

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
    const operator = this.getAttribute(AttributeData.Condition.Operator, this.selectedNode);
    const value = this.getAttribute(AttributeData.Condition.Value, this.selectedNode);

    if (operator) {
      this.operatorFormControl.setValue(operator.value$.value, { emitEvent: false });
    }
    if (value) {
      this.valueFormControl.setValue(value.value$.value, { emitEvent: false });
    }

    this.setupBooleanOptions();

    this.setupFormToModelBindings();
  }

  private setupFormToModelBindings() {
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

  private setupBooleanOptions() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      this.booleanOptions$ = of(<BooleanModel>{});
      return;
    }

    this.booleanOptions$ = parentEntityNode.validationResult$.pipe(
      distinctUntilChanged((prev, curr) => prev.isValid === curr.isValid),
      takeUntil(this.destroy$),
      switchMap(validationResult => {
        if (validationResult.isValid) {
          parentEntityNode.attributes$.pipe(
            distinctUntilChanged((prev, curr) => prev.length === curr.length),
            switchMap(attributes => {
              const attribute = attributes.find(attr => attr.editorName === AttributeNames.entityName);
              if (attribute) {
                return this.booleanService.getBooleanValues(attribute.editorName, this.attributeValue);
              }
              return of(<BooleanModel>{});
            })
          )
        }
        return of(<BooleanModel>{});
      })
    )
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
