import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, distinctUntilChanged, map, of, startWith, switchMap, takeUntil, BehaviorSubject, catchError, debounceTime, filter } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from 'src/app/components/query-builder/services/entity-services/attribute-entity.service';
import { AttributeType } from '../../../models/constants/dataverse/attribute-types';
import { FilterOperatorTypes } from '../../../models/constants/ui/option-set-types';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { BaseFormComponent } from '../base-form.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { QuickActionsComponent } from '../quick-actions/quick-actions.component';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { LoadingIndicatorComponent } from 'src/app/components/loading-indicator/loading-indicator.component';
import { NumberFormComponent } from './number-form/number-form.component';
import { BooleanFormComponent } from './boolean-form/boolean-form.component';
import { IdFormComponent } from './id-form/id-form.component';
import { PicklistFormComponent } from './picklist-form/picklist-form.component';
import { StatusFormComponent } from './status-form/status-form.component';
import { DateTimeFormComponent } from './date-time-form/date-time-form.component';
import { StringFormComponent } from './string-form/string-form.component';
import { MatIconModule } from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {FormsModule} from '@angular/forms';
import { NodeTreeService } from 'src/app/components/query-builder/services/node-tree.service';
@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    QuickActionsComponent,
    MatOptionModule,
    MatAutocompleteModule,
    LoadingIndicatorComponent,
    NumberFormComponent,
    BooleanFormComponent,
    IdFormComponent,
    PicklistFormComponent,
    StatusFormComponent,
    DateTimeFormComponent,
    StringFormComponent,
    MatIconModule,
    MatButtonModule,
    FormsModule
  ],
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
  private previousAttribute: string = null;

  attributes$: Observable<AttributeModel[]>;
  filteredAttributes$: Observable<AttributeModel[]>;
  entityName$: Observable<string>;
  selectedAttribute$: BehaviorSubject<AttributeModel> = new BehaviorSubject<AttributeModel>(null);
  FilterOperatorTypes = FilterOperatorTypes;

  attributeFormControl = new FormControl('');

  isValidAttributeSelected = false;

  constructor(
    private attributeEntityService: AttributeEntityService,
    private nodeTreeService: NodeTreeService) { super(); }

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

    this.setInputInitialValues();

    this.setupAttributesSubscription();

    this.setupFormToModelBinding();

    this.setupFiltering();
  }

  removeNode() {
    this.nodeTreeService.removeNode(this.selectedNode);
  }

  setupFormToModelBinding() {
    this.attributeFormControl.valueChanges.pipe(
      distinctUntilChanged(),
      filter(() => this.attributeFormControl.dirty),
      takeUntil(this._destroy$))
      .subscribe(value => {
        this.selectedNode.setAttribute(this.conditionAttribute, value);
      });
  }

  setupAttributesSubscription() {
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
  }

  private setInputInitialValues() {
    const attribute = this.getAttribute(this.conditionAttribute, this.selectedNode);

    if (attribute) {
      this.attributeFormControl.setValue(attribute.value$.value, { emitEvent: false });
    }
  }

  private setupFiltering() {

    const initialValue = this.attributeFormControl.value;
    this.filteredAttributes$ = this.attributeFormControl.valueChanges.pipe(
      debounceTime(50),
      startWith(initialValue),
      switchMap(value => value ? this.filter(value) : this.attributes$)
    );
  }

  private filter(value: any): Observable<AttributeModel[]> {
    const filterValue = typeof value === 'object' && value && 'logicalName' in value
      ? value.logicalName.toLowerCase()
      : String(value || '').toLowerCase();

    return this.attributes$.pipe(
      map(attributes => {
        const attribute = attributes.find(attr => attr.logicalName.toLowerCase() === filterValue);
        if (attribute) {
          const currentAttributeValue = attribute.logicalName;
          
          // If attribute changed, clear operator and value attributes
          if (this.previousAttribute !== null && this.previousAttribute !== currentAttributeValue) {
            // Remove operator and value when attribute changes
            this.selectedNode.removeAttribute(this.conditionOperator.EditorName);
            this.selectedNode.removeAttribute(this.conditionValue.EditorName);
            this.isValidAttributeSelected = true;
          }

          this.updateAttribute(this.conditionAttribute, this.selectedNode, attribute.logicalName, attribute);
          this.selectedAttribute$.next(attribute);
          this.previousAttribute = currentAttributeValue;
        }
        else {
          this.isValidAttributeSelected = false;
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
      this.attributeFormControl.value === '') {
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
        return FilterOperatorTypes.PICKLIST;
      case AttributeType.STATE:
      case AttributeType.STATUS:
        return FilterOperatorTypes.STATUS;
      default:
        return FilterOperatorTypes.STRING;
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
