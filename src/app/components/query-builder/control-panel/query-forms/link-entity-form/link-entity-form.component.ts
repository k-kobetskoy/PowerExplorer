import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, combineLatest, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, finalize } from 'rxjs/operators';
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkEntityFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  
  // Form group
  linkEntityForm: FormGroup;

  // Observables for autocomplete
  filteredEntities$: Observable<EntityModel[]>;
  filteredFromAttributes$: Observable<AttributeModel[]>;
  filteredToAttributes$: Observable<AttributeModel[]>;

  readonly linkTypes = LinkTypeOptions;

  constructor(
    private entityService: EntityEntityService,
    private attributeService: AttributeEntityService,
    private fb: FormBuilder
  ) {
    super();
  }

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedNode'] && this.selectedNode) {
      // Clean up existing subscriptions
      this.destroy$.next();
      
      // Reinitialize the form
      this.initializeForm();
    }
  }

  private initializeForm() {
    this.createFormGroup();
    this.setupInitialValues();
    this.setupEntityAutocomplete();
    this.setupAttributeAutocomplete();
    this.setupFormSubscriptions();
  }

  private createFormGroup() {
    this.linkEntityForm = this.fb.group({
      entity: [''],
      fromAttribute: [{ value: '', disabled: true }],
      toAttribute: [{ value: '', disabled: true }],
      linkType: [''],
      alias: [''],
      intersect: [false],
      visible: [false],
      showOnlyLookups: [false]
    });
  }

  private setupInitialValues() {
    // Set initial values from node attributes
    this.linkEntityForm.patchValue({
      entity: this.getAttributeValue(this.AttributeData.Link.Entity),
      fromAttribute: this.getAttributeValue(this.AttributeData.Link.From),
      toAttribute: this.getAttributeValue(this.AttributeData.Link.To),
      linkType: this.getAttributeValue(this.AttributeData.Link.Type),
      alias: this.getAttributeValue(this.AttributeData.Link.Alias),
      intersect: this.getAttributeValue(this.AttributeData.Link.Intersect) === 'true',
      visible: this.getAttributeValue(this.AttributeData.Link.Visible) === 'true',
      showOnlyLookups: this.selectedNode.showOnlyLookups$.value
    });
  }

  private setupEntityAutocomplete() {
    this.filteredEntities$ = combineLatest([
      this.linkEntityForm.get('entity').valueChanges.pipe(startWith(this.linkEntityForm.get('entity').value || '')),
      this.entityService.getEntities()
    ]).pipe(
      debounceTime(300),
      map(([value, entities]) => this.filterEntities(value, entities))
    );
  }

  private setupAttributeAutocomplete() {
    // From attributes
    this.filteredFromAttributes$ = combineLatest([
      this.linkEntityForm.get('fromAttribute').valueChanges.pipe(startWith(this.linkEntityForm.get('fromAttribute').value || '')),
      this.linkEntityForm.get('entity').valueChanges.pipe(
        switchMap(entityName => {
          if (!entityName) return of([]);
          return this.attributeService.getAttributes(entityName);
        })
      ),
      this.linkEntityForm.get('showOnlyLookups').valueChanges.pipe(startWith(this.linkEntityForm.get('showOnlyLookups').value))
    ]).pipe(
      map(([value, attributes, showOnlyLookups]) => 
        this.filterAttributes(value, attributes, showOnlyLookups)
      )
    );

    // To attributes
    const parentEntityNode = this.selectedNode.getParentEntity();
    if (!parentEntityNode) {
      this.filteredToAttributes$ = of([]);
      return;
    }

    this.filteredToAttributes$ = combineLatest([
      this.linkEntityForm.get('toAttribute').valueChanges.pipe(startWith(this.linkEntityForm.get('toAttribute').value || '')),
      this.selectedNode.getParentEntityName(parentEntityNode).pipe(
        distinctUntilChanged(),
        switchMap(entityName => {
          if (!entityName || entityName.trim() === '') {
            console.warn('Empty parent entity name');
            return of([]);
          }
          
          // Check parent entity validation state before proceeding
          return parentEntityNode.validationPassed$.pipe(
            switchMap(isValid => {
              if (!isValid) {
                console.warn(`Parent entity '${entityName}' validation failed`);
                return of([]);
              }              
              return this.attributeService.getAttributes(entityName);
            })
          );
        })
      ),
      this.linkEntityForm.get('showOnlyLookups').valueChanges.pipe(startWith(this.linkEntityForm.get('showOnlyLookups').value))
    ]).pipe(
      map(([value, attributes, showOnlyLookups]) => 
        this.filterAttributes(value, attributes, showOnlyLookups)
      )
    );
  }

  private setupFormSubscriptions() {
    this.linkEntityForm.get('entity').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.linkEntityForm.get('fromAttribute').enable();
        } else {
          this.linkEntityForm.get('fromAttribute').disable();
          this.linkEntityForm.get('fromAttribute').setValue('');
        }
        this.updateAttribute(this.AttributeData.Link.Entity, value);
      });

    const parentEntityNode = this.selectedNode.getParentEntity();
    if (parentEntityNode) {
      this.selectedNode.getParentEntityName(parentEntityNode)
        .pipe(takeUntil(this.destroy$))
        .subscribe(entityName => {
          if (entityName) {
            this.linkEntityForm.get('toAttribute').enable();
          } else {
            this.linkEntityForm.get('toAttribute').disable();
            this.linkEntityForm.get('toAttribute').setValue('');
          }
        });
    } else {
      this.linkEntityForm.get('toAttribute').disable();
      this.linkEntityForm.get('toAttribute').setValue('');
    }

    // Subscribe to form value changes
    this.linkEntityForm.get('fromAttribute').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.From, value));

    this.linkEntityForm.get('toAttribute').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.To, value));

    this.linkEntityForm.get('linkType').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.Type, value));

    this.linkEntityForm.get('alias').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.Alias, value));

    this.linkEntityForm.get('intersect').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.Intersect, value.toString()));

    this.linkEntityForm.get('visible').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.updateAttribute(this.AttributeData.Link.Visible, value.toString()));

    this.linkEntityForm.get('showOnlyLookups').valueChanges
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