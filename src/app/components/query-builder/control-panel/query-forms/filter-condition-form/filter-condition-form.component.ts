import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subject, distinctUntilChanged, map, of, startWith, switchMap, takeUntil } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from 'src/app/components/query-builder/services/entity-services/attribute-entity.service';
import { AttributeTypes } from '../../../models/constants/dataverse/attribute-types';
import { FilterOperatorTypes } from '../../../models/constants/ui/option-set-types';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { BaseFormComponent } from '../base-form.component';

@Component({
  selector: 'app-filter-condition-form',
  templateUrl: './filter-condition-form.component.html',
  styleUrls: ['./filter-condition-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterConditionFormComponent extends BaseFormComponent implements OnInit, OnChanges, OnDestroy {
  private _destroy$ = new Subject<void>();
  private readonly conditionAttribute = AttributeData.Condition.Attribute;
  private readonly conditionOperator = AttributeData.Condition.Operator;
  private readonly conditionValue = AttributeData.Condition.Value;

  @Input() override selectedNode: QueryNode;

  conditionForm: FormGroup;
  attributes$: Observable<AttributeModel[]>;
  filteredAttributes$: Observable<AttributeModel[]>;
  entityName$: Observable<string>;
  selectedAttribute$: Observable<AttributeModel>;
  FilterOperatorTypes = FilterOperatorTypes;
  previousAttribute: AttributeModel;

  constructor(
    private attributeEntityService: AttributeEntityService,
    private fb: FormBuilder
  ) { 
    super();
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedNode'] && this.selectedNode) {
      this._destroy$.next();
      this.previousAttribute = null;
      this.initializeForm();
    }
  }

  private initializeForm() {
    // Create form with existing attribute values
    const attributeValue = this.getAttributeValue(this.conditionAttribute);
    
    this.conditionForm = this.fb.group({
      attribute: [attributeValue]
    });

    const parentEntityNode = this.selectedNode.getParentEntity();

    this.entityName$ = parentEntityNode
      ? this.selectedNode.getParentEntityName(parentEntityNode)
      : of('');

    this.attributes$ = this.entityName$.pipe(
      distinctUntilChanged(),
      switchMap(entityName => {
        if (!entityName || entityName.trim() === '') { return of([]); }
    
        return parentEntityNode.validationPassed$.pipe(
          switchMap(isValid => {
            if (!isValid) {
              return of([]);
            }
            return this.attributeEntityService.getAttributes(entityName);
          })
        );
      })
    );

    const initialValue = this.conditionForm.get('attribute').value;
    this.setupFiltering(initialValue);

    this.conditionForm.get('attribute').valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this._destroy$))
      .subscribe(value => {
        this.selectedNode.setAttribute(this.conditionAttribute, value);
      });
  }

  private setupFiltering(initialValue: string) {
    this.filteredAttributes$ = this.conditionForm.get('attribute').valueChanges.pipe(
      startWith(initialValue),
      switchMap(value => value ? this._filter(value) : this.attributes$)
    );
  }

  private _filter(value: any): Observable<AttributeModel[]> {
    const filterValue = typeof value === 'object' && value && 'logicalName' in value
      ? value.logicalName.toLowerCase()
      : String(value || '').toLowerCase();

    return this.attributes$.pipe(
      map(attributes => {
        const attribute = attributes.find(attr => attr.logicalName.toLowerCase() === filterValue);
        if (attribute) {
          this.handleAttributeChange(attribute);
          this.selectedAttribute$ = of(attribute);
          this.previousAttribute = attribute;
        }

        return attributes.filter(entity =>
          entity.logicalName.toLowerCase().includes(filterValue) ||
          entity.displayName.toLowerCase().includes(filterValue)
        );
      })
    );
  }

  onKeyPressed($event: KeyboardEvent) {
    if (($event.key === 'Delete' || $event.key === 'Backspace') &&
      this.conditionForm.get('attribute').value === '') {
      this.selectedNode.setAttribute(this.conditionAttribute, null);
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
