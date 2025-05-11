import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormControl, FormsModule, ReactiveFormsModule    } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, combineLatest, of } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap, takeUntil, filter, take, catchError, shareReplay } from 'rxjs/operators';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { QueryNode } from '../../../models/query-node';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { AttributeData } from '../../../models/constants/attribute-data';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { QuickActionsComponent } from '../quick-actions/quick-actions.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NodeTreeService } from 'src/app/components/query-builder/services/node-tree.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NodeActionsComponent } from '../node-actions/node-actions.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    QuickActionsComponent,
    MatIconModule,
    MatButtonModule,
    FormsModule,
    MatProgressSpinnerModule,
    NodeActionsComponent
  ],
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  isLoadingAttributes$ : BehaviorSubject<boolean>;
  filteredAttributes$: Observable<AttributeModel[]>;

  attributeFormControl = new FormControl('');
  descendingFormControl = new FormControl(false);

  parentEntityAttributes$: Observable<AttributeModel[]>;

  @Input() selectedNode: QueryNode;

  constructor(private attributeService: AttributeEntityService,
    private nodeTreeService: NodeTreeService) { super(); }

  ngOnInit() {
    this.initializeForm();
    this.isLoadingAttributes$ = this.attributeService.getAttributesIsLoading$;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedNode'] && this.selectedNode) {
      this.destroy$.next();
      this.initializeForm();
    }
  }

  private initializeForm() {
    this.setupInitialValues();

    this.setupParentEntityAttributesObservable();

    this.setupAttributeAutocomplete();

    this.setupInputsToModelsBindings();
  }

  removeNode() {
    this.nodeTreeService.removeNode(this.selectedNode);
  }

  setupInputsToModelsBindings() {
    this.attributeFormControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.updateAttribute(AttributeData.Order.Attribute, this.selectedNode, value);
    });

    this.descendingFormControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.updateAttribute(AttributeData.Order.Desc, this.selectedNode, value.toString());
    });
  }

  setupParentEntityAttributesObservable() {
    const parentEntity = this.selectedNode.getParentEntity();
    
    if (!parentEntity) {
      this.parentEntityAttributes$ = of([]);
      return;
    }

    this.parentEntityAttributes$ = parentEntity.validationResult$.pipe(
      take(1),
      switchMap(validationResult => {
        if (!validationResult.isValid) {
          console.warn('[OrderFormComponent] Parent entity validation failed');
          return of([]);
        }
        return parentEntity.attributes$.pipe(
          map(attributes => attributes.find(attr => attr.editorName === AttributeNames.entityName)),
          filter(entityAttribute => !!entityAttribute),
          switchMap(entityAttribute => {
            return entityAttribute.value$.pipe(
              distinctUntilChanged(),
              filter(entityName => !!entityName),
              switchMap(entityName => {
                return this.attributeService.getAttributes(entityName);
              }),
              catchError(error => {
                console.error(`[OrderFormComponent] Error fetching attributes`, error);
                return of([]);
              })
            );
          }),
          catchError(error => {
            console.error(`[OrderFormComponent] Error in entity attributes pipe`, error);
            return of([]);
          }),
          shareReplay(1)
        );
      })
    );     
  }

  private setupInitialValues() {
    // Handle attribute initialization
    const attribute = this.getAttribute(AttributeData.Order.Attribute, this.selectedNode);
    if (attribute && attribute.value$ && attribute.value$.value) {
      this.attributeFormControl.setValue(attribute.value$.value, { emitEvent: false });
    } else {
      this.attributeFormControl.setValue('', { emitEvent: false });
    }

    // Handle descending initialization
    const descending = this.getAttribute(AttributeData.Order.Desc, this.selectedNode);
    if (descending && descending.value$) {
      this.descendingFormControl.setValue(descending.value$.value === 'true', { emitEvent: false });
    } else {
      this.descendingFormControl.setValue(false, { emitEvent: false });
    }
  }

  private setupAttributeAutocomplete() {
    // First ensure parentEntityAttributes$ has a default empty state
    this.parentEntityAttributes$ = this.parentEntityAttributes$ || of([]);
    
    // Create the filtered attributes observable with better handling of null/undefined values
    this.filteredAttributes$ = combineLatest([
      this.attributeFormControl.valueChanges.pipe(
        startWith(this.attributeFormControl.value || ''),
        map(value => value || '') // Ensure we always have a string
      ),
      this.parentEntityAttributes$.pipe(
        startWith([]) // Start with empty array to ensure combineLatest emits right away
      )
    ]).pipe(
      map(([value, attributes]) => this.filterAttributes(value, attributes || [])),
      shareReplay(1) // Share the result to prevent multiple subscriptions from causing multiple API calls
    );
  }

  private filterAttributes(value: string, attributes: AttributeModel[]): AttributeModel[] {
    if (!attributes || attributes.length === 0) {
      return [];
    }
    
    const filterValue = (value || '').toLowerCase();
    return attributes.filter(attr =>
      attr.logicalName.toLowerCase().includes(filterValue) ||
      attr.displayName.toLowerCase().includes(filterValue)
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
