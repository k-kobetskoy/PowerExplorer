import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { EntityEntityService } from '../../../services/entity-services/entity-entity.service';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { LinkTypeOptions } from '../../../models/constants/ui/link-type-options';
import { AttributeTypes } from '../../../models/constants/dataverse/attribute-types';

@Component({
  selector: 'app-link-entity-form',
  templateUrl: './link-entity-form.component.html',
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-field {
      width: 100%;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
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
  `]
})
export class LinkEntityFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  
  // Form controls
  entityFormControl = new FormControl('');
  fromAttributeFormControl = new FormControl({ value: '', disabled: true });
  toAttributeFormControl = new FormControl({ value: '', disabled: true });
  linkTypeFormControl = new FormControl('');
  aliasFormControl = new FormControl('');
  intersectControl = new FormControl(false);
  visibleControl = new FormControl(false);
  showOnlyLookupsControl = new FormControl(false);

  // Observables for autocomplete
  filteredEntities$: Observable<EntityModel[]>;
  filteredFromAttributes$: Observable<AttributeModel[]>;
  filteredToAttributes$: Observable<AttributeModel[]>;
  loading$ = new BehaviorSubject<boolean>(false);

  readonly linkTypes = LinkTypeOptions;

  constructor(
    private entityService: EntityEntityService,
    private attributeService: AttributeEntityService
  ) {
    super();
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedNode) {
      // Clean up existing subscriptions
      this.destroy$.next();
      
      // Reinitialize the form
      this.initializeForm();
    }
  }

  private initializeForm() {
    this.setupInitialValues();
    this.setupEntityAutocomplete();
    this.setupAttributeAutocomplete();
    this.setupFormSubscriptions();
  }

  private setupInitialValues() {
    // Set initial values from node attributes
    this.entityFormControl.setValue(this.getAttributeValue(this.AttributeData.Link.Entity));
    this.fromAttributeFormControl.setValue(this.getAttributeValue(this.AttributeData.Link.From));
    this.toAttributeFormControl.setValue(this.getAttributeValue(this.AttributeData.Link.To));
    this.linkTypeFormControl.setValue(this.getAttributeValue(this.AttributeData.Link.Type));
    this.aliasFormControl.setValue(this.getAttributeValue(this.AttributeData.Link.Alias));
    this.intersectControl.setValue(this.getAttributeValue(this.AttributeData.Link.Intersect) === 'true');
    this.visibleControl.setValue(this.getAttributeValue(this.AttributeData.Link.Visible) === 'true');
    this.showOnlyLookupsControl.setValue(this.selectedNode.showOnlyLookups$.value);
  }

  private setupEntityAutocomplete() {
    this.filteredEntities$ = combineLatest([
      this.entityFormControl.valueChanges.pipe(startWith('')),
      this.entityService.getEntities()
    ]).pipe(
      debounceTime(300),
      map(([value, entities]) => this.filterEntities(value, entities))
    );
  }

  private setupAttributeAutocomplete() {
    // From attributes
    this.filteredFromAttributes$ = combineLatest([
      this.fromAttributeFormControl.valueChanges.pipe(startWith('')),
      this.entityFormControl.valueChanges.pipe(
        switchMap(entityName => 
          entityName ? this.attributeService.getAttributes(entityName) : []
        )
      ),
      this.showOnlyLookupsControl.valueChanges.pipe(startWith(false))
    ]).pipe(
      map(([value, attributes, showOnlyLookups]) => 
        this.filterAttributes(value, attributes, showOnlyLookups)
      )
    );

    // To attributes
    this.filteredToAttributes$ = combineLatest([
      this.toAttributeFormControl.valueChanges.pipe(startWith('')),
      this.selectedNode.getParentEntityName().pipe(
        switchMap(entityName => 
          entityName ? this.attributeService.getAttributes(entityName) : []
        )
      ),
      this.showOnlyLookupsControl.valueChanges.pipe(startWith(false))
    ]).pipe(
      map(([value, attributes, showOnlyLookups]) => 
        this.filterAttributes(value, attributes, showOnlyLookups)
      )
    );
  }

  private setupFormSubscriptions() {
    // Enable/disable attribute controls based on entity selection
    this.entityFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.fromAttributeFormControl.enable();
        } else {
          this.fromAttributeFormControl.disable();
          this.fromAttributeFormControl.setValue('');
        }
        this.updateAttribute(this.AttributeData.Link.Entity, value);
      });

    // Subscribe to parent entity changes for to-attribute field
    this.selectedNode.getParentEntityName()
      .pipe(takeUntil(this.destroy$))
      .subscribe(entityName => {
        if (entityName) {
          this.toAttributeFormControl.enable();
        } else {
          this.toAttributeFormControl.disable();
          this.toAttributeFormControl.setValue('');
        }
      });

    // Subscribe to other form control changes
    this.fromAttributeFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.From, value));

    this.toAttributeFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.To, value));

    this.linkTypeFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.Type, value));

    this.aliasFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.Alias, value));

    this.intersectControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.Intersect, value.toString()));

    this.visibleControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.Visible, value.toString()));

    this.showOnlyLookupsControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.selectedNode.showOnlyLookups$.next(value));
  }

  private filterEntities(value: string, entities: EntityModel[]): EntityModel[] {
    const filterValue = value?.toLowerCase() || '';
    return entities.filter(entity => 
      entity.logicalName.toLowerCase().includes(filterValue) ||
      entity.displayName.toLowerCase().includes(filterValue)
    );
  }

  private filterAttributes(value: string, attributes: AttributeModel[], showOnlyLookups: boolean): AttributeModel[] {
    let filtered = attributes;
    if (showOnlyLookups) {
      filtered = filtered.filter(attr => attr.attributeType === AttributeTypes.LOOKUP);
    }
    const filterValue = value?.toLowerCase() || '';
    return filtered.filter(attr =>
      attr.logicalName.toLowerCase().includes(filterValue) ||
      attr.displayName.toLowerCase().includes(filterValue)
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}