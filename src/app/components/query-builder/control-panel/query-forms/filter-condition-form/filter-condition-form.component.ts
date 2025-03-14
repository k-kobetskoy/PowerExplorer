import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subject, distinctUntilChanged, map, of, startWith, switchMap, takeUntil, BehaviorSubject, catchError, debounceTime } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from 'src/app/components/query-builder/services/entity-services/attribute-entity.service';
import { AttributeType } from '../../../models/constants/dataverse/attribute-types';
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

  @Input() selectedNode: QueryNode;

  conditionForm: FormGroup;
  attributes$: Observable<AttributeModel[]>;
  filteredAttributes$: Observable<AttributeModel[]>;
  entityName$: Observable<string>;
  selectedAttribute$: BehaviorSubject<AttributeModel> = new BehaviorSubject<AttributeModel>(null);
  FilterOperatorTypes = FilterOperatorTypes;

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
      this.initializeForm();
    }
  }

  private initializeForm() {
    const attribute = this.getAttribute(this.conditionAttribute, this.selectedNode);

    if(attribute) {
      this.selectedAttribute$.next(attribute.getAttributeModel());
    }

    this.conditionForm = this.fb.group({
      attribute: [attribute || '']
    });

    const parentEntityNode = this.selectedNode.getParentEntity();

    this.attributes$ = parentEntityNode.validationResult$.pipe(
      distinctUntilChanged((prev, curr) => prev.isValid === curr.isValid),
      switchMap(validationResult => {
        if (!validationResult.isValid) { return of([]); }

        return this.selectedNode.getParentEntityName(parentEntityNode).pipe(
          distinctUntilChanged(),
          switchMap(entityName => {
            return this.attributeEntityService.getAttributes(entityName);
          })
        );
      }),
      catchError(error => {
        console.error('Error loading attributes:', error);
        return of([]);
      }),
      takeUntil(this._destroy$)
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
      debounceTime(50),
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
          this.updateAttribute(this.conditionAttribute, this.selectedNode, attribute.logicalName, attribute);
          this.selectedAttribute$.next(attribute);
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


  getFilterOperatorType(attribute: AttributeModel) {
    switch (attribute.attributeType) {
      case AttributeType.INTEGER:
      case AttributeType.DECIMAL:
      case AttributeType.BIG_INT:
      case AttributeType.MONEY:
      case AttributeType.DOUBLE:
        return FilterOperatorTypes.NUMBER;
      case AttributeType.DATE_TIME:
        return FilterOperatorTypes.DATE_TIME;
      case AttributeType.BOOLEAN:
        return FilterOperatorTypes.BOOLEAN;
      case AttributeType.UNIQUE_IDENTIFIER:
      case AttributeType.LOOKUP:
      case AttributeType.OWNER:
      case AttributeType.CUSTOMER:
        return FilterOperatorTypes.ID;
      case AttributeType.PICKLIST:
      case AttributeType.STATE:
      case AttributeType.STATUS:
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
