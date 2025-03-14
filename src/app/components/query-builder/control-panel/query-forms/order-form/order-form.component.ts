import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormControl } from '@angular/forms';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap, takeUntil, filter, take, catchError, shareReplay } from 'rxjs/operators';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { QueryNode } from '../../../models/query-node';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { AttributeData } from '../../../models/constants/attribute-data';

@Component({
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
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

    .logical-name {
      font-weight: 500;
    }

    .display-name {
      font-size: 0.85em;
      color: rgba(0, 0, 0, 0.6);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  filteredAttributes$: Observable<AttributeModel[]>;

  attributeFormControl = new FormControl('');
  descendingFormControl = new FormControl(false);

  attributeInput$: Observable<string>;
  descendingInput$: Observable<boolean>;

  @Input() selectedNode: QueryNode;

  constructor(private attributeService: AttributeEntityService) { super(); }

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
    // Create form with existing attribute values

    // Model -> Form input
    this.setupAttributeModelToFormBindings();
    this.setupDescendingModelToFormBindings();

    this.attributeInput$ = this.attributeFormControl.valueChanges.pipe(
      startWith(this.attributeFormControl.value || ''),
      shareReplay(1)
    );

    this.descendingInput$ = this.descendingFormControl.valueChanges.pipe(
      startWith(this.descendingFormControl.value || false),
      shareReplay(1)
    );

    this.setupAttributeAutocomplete();


    // Form input -> Model
    this.setupInputsToModelsBindings();
  }

  private setupInputsToModelsBindings() {
    this.attributeInput$.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.updateAttribute(AttributeData.Order.Attribute, this.selectedNode, value);
    });

    this.descendingInput$.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.updateAttribute(AttributeData.Order.Desc, this.selectedNode, value.toString());
    });
  }

  private setupAttributeModelToFormBindings() {
    this.selectedNode.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      takeUntil(this.destroy$),
      filter(attributes => attributes.length > 0),
    ).subscribe(attributes => {
      const attribute = attributes.find(attr => attr.editorName === AttributeNames.orderAttribute);
      if (attribute) {
        attribute.value$.pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged()
        ).subscribe(value => {
          this.attributeFormControl.setValue(value, { emitEvent: false });
        });
      }
    });
  }

  private setupDescendingModelToFormBindings() {
    const descending = this.getAttribute(AttributeData.Order.Desc, this.selectedNode);
    if (descending) {
      this.descendingFormControl.setValue(descending.value$.value === 'true', { emitEvent: false });
    }
  }

  private setupAttributeAutocomplete() {
    const parentNode = this.selectedNode.getParentEntity();
    if (!parentNode || parentNode.validationResult$.pipe(take(1)).subscribe(result => !result.isValid)) {
      this.filteredAttributes$ = of([]);
      return;
    }

    const parentEntityAttribute$ = parentNode.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      map(attributes => attributes.find(attr => attr.editorName === AttributeNames.entityName)),
      takeUntil(this.destroy$),
      switchMap(entityAttribute => {
        return entityAttribute.value$.pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged(),
          switchMap(entityName => this.attributeService.getAttributes(entityName)),
          catchError(error => {
            console.error(`[LinkEntityFormComponent] Error fetching attributes`, error);
            return of([] as AttributeModel[]);
          })
        )
      })
    );

    this.filteredAttributes$ = combineLatest([
      this.attributeInput$,
      parentEntityAttribute$,
    ]).pipe(
      map(([value, attributes]) => this.filterAttributes(value, attributes))
    );
  }

  private filterAttributes(value: string, attributes: AttributeModel[]): AttributeModel[] {
    const filterValue = value.toLowerCase();
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
