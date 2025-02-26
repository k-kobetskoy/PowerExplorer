import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subject, distinctUntilChanged, map, of, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from 'src/app/components/query-builder/services/entity-services/attribute-entity.service';
import { AttributeTypes } from '../../../models/constants/dataverse/attribute-types';
import { FilterOperatorTypes } from '../../../models/constants/ui/option-set-types';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

@Component({
  selector: 'app-filter-condition-form',
  templateUrl: './filter-condition-form.component.html',
  styleUrls: ['./filter-condition-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterConditionFormComponent implements OnChanges, OnDestroy {

  private _destroy$ = new Subject<void>();

  private readonly conditionAttribute = AttributeData.Condition.Attribute;
  private readonly conditionOperator = AttributeData.Condition.Operator;
  private readonly conditionValue = AttributeData.Condition.Value;

  @Input() selectedNode: QueryNode;

  conditionForm: FormGroup;

  attributes$: Observable<AttributeModel[]>;
  filteredAttributes$: Observable<AttributeModel[]> = null;

  entityName$: Observable<string>

  selectedAttribute$: Observable<AttributeModel>;

  FilterOperatorTypes = FilterOperatorTypes;

  previousAttribute: AttributeModel;

  constructor(
    private _attributeEntityService: AttributeEntityService,
    private fb: FormBuilder) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedNode) {
      this._destroy$.next();

      this.previousAttribute = null;
      this.createFormGroup();
      this.getInitialData();
      this.addFilterToInput();
      this.setControlsInitialValues();
      this.bindDataToControls();
    }
  }

  private createFormGroup() {
    this.conditionForm = this.fb.group({
      attribute: ['']
    });
  }

  bindDataToControls() {
    this.conditionForm.get('attribute').valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this._destroy$))
      .subscribe(value => this.selectedNode.setAttribute(this.conditionAttribute, value));
  }

  setControlsInitialValues() {
    const attributeInitialValue = this.selectedNode.attributes$.getValue()[this.conditionAttribute.Order - 1]?.value$.getValue();

    this.conditionForm.patchValue({
      attribute: attributeInitialValue ?? ''
    });
  }

  getInitialData() {
    this.entityName$ = this.selectedNode.getParentEntityName();

    this.attributes$ = this.entityName$
      .pipe(
        distinctUntilChanged(),
        switchMap(entityName => {
          if (!entityName) {
            return of([]);
          }
          return this._attributeEntityService.getAttributes(entityName)
        }));
  }

  addFilterToInput() {
    const initialValue = this.selectedNode.attributes$.getValue()[this.conditionAttribute.Order - 1]?.value$.getValue() ?? '';
    
    this.filteredAttributes$ = this.conditionForm.get('attribute').valueChanges.pipe(
      startWith(initialValue),
      switchMap(value => value ? this._filter(value) : this.attributes$),
    );
  }

  private _filter(value: string): Observable<AttributeModel[]> {
    const filterValue = value.toLowerCase();

    return this.attributes$.pipe(
      map(
        attributes => {
          const attribute = attributes.find(attr => attr.logicalName.toLowerCase() === filterValue);
          if (attribute) {
            this.handleAttributeChange(attribute);
            this.selectedAttribute$ = of(attribute);
            this.previousAttribute = attribute;
          };
          return attributes.filter(entity =>
            entity.logicalName.toLowerCase().includes(filterValue) ||
            entity.displayName.toLowerCase().includes(filterValue)
          )
        }),
      tap(_ => this.selectedNode.setAttribute(this.conditionAttribute, filterValue)));
  }

  onKeyPressed($event: KeyboardEvent) {
    if ($event.key === 'Delete' || $event.key === 'Backspace') {
      if (this.conditionForm.get('attribute').value === '') {
        this.selectedNode.setAttribute(this.conditionAttribute, null);
      }
    }
  }

  handleAttributeChange(attribute: AttributeModel): void {
    if (!this.previousAttribute || attribute.logicalName === this.previousAttribute?.logicalName) return;
    this.selectedNode.setAttribute(this.conditionOperator, null);
    this.selectedNode.setAttribute(this.conditionValue, null);
  }

  getFilterOperatorType(attribute: AttributeModel) {
    switch (attribute.attributeType) {
      case AttributeTypes.INTEGER:
      case AttributeTypes.DECIMAL:
      case AttributeTypes.BIG_INT:
      case AttributeTypes.MONEY:
      case AttributeTypes.DOUBLE:
        return FilterOperatorTypes.NUMBER;
      case AttributeTypes.DATE_TIME:
        return FilterOperatorTypes.DATE_TIME;
      case AttributeTypes.BOOLEAN:
        return FilterOperatorTypes.BOOLEAN;
      case AttributeTypes.UNIQUE_IDENTIFIER:
      case AttributeTypes.LOOKUP:
      case AttributeTypes.OWNER:
      case AttributeTypes.CUSTOMER:
        return FilterOperatorTypes.ID;
      case AttributeTypes.PICKLIST:
      case AttributeTypes.STATE:
      case AttributeTypes.STATUS:
        return FilterOperatorTypes.PICKLIST;
      default:
        return FilterOperatorTypes.STRING;
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
