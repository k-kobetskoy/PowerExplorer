import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, Input } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, combineLatest, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, finalize, filter, catchError, take, shareReplay } from 'rxjs/operators';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { EntityEntityService } from '../../../services/entity-services/entity-entity.service';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { LinkTypeOptions } from '../../../models/constants/ui/link-type-options';
import { AttributeType } from '../../../models/constants/dataverse/attribute-types';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { AttributeNames } from '../../../models/constants/attribute-names';
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
  @Input() selectedNode: QueryNode;

  private destroy$ = new Subject<void>();

  readonly linkTypes = LinkTypeOptions;

  entityNameFormControl = new FormControl('');
  fromAttributeFormControl = new FormControl('');
  toAttributeFormControl = new FormControl('');
  linkTypeFormControl = new FormControl('');
  aliasFormControl = new FormControl('');
  intersectFormControl = new FormControl(false);
  visibleFormControl = new FormControl(false);
  showOnlyLookupsFormControl = new FormControl(false);

  // Observables for autocomplete
  filteredEntities$: Observable<EntityModel[]>; // New entity to link to 
  filteredFromAttributes$: Observable<AttributeModel[]>; // From attribute of the new entity
  filteredToAttributes$: Observable<AttributeModel[]>; // To attribute of the parent entity

  entities$: Observable<EntityModel[]>;
  fromAttributes$: Observable<AttributeModel[]>;
  toAttributes$: Observable<AttributeModel[]>;


  showOnlyLookups$: Observable<boolean>;

  constructor(
    private entityService: EntityEntityService,
    private attributeService: AttributeEntityService) { super(); }

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
    this.setupInitialValues();

    // TODO: Check if this is needed
    // Model -> Form input
    this.setupEntityModelToFormBinding();
    this.setupFromAttributeModelToFormBindings();
    this.setupToAttributeModelToFormBindings();

    this.setupEntityAutocomplete();    
    this.setupFromAttributeAutocomplete();
    this.setupToAttributeAutocomplete();
  }

  private setupEntityModelToFormBinding() {
    this.selectedNode.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      takeUntil(this.destroy$),
      filter(attributes => attributes.length > 0),
    ).subscribe(attributes => {
      const entityName = attributes.find(attr => attr.editorName === AttributeNames.linkEntity);

      if (entityName) {
        entityName.value$.pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged()
        ).subscribe(value => {
          this.entityNameFormControl.setValue(value, { emitEvent: false });
        });
      }
    });
  }

  setupFromAttributeModelToFormBindings() {
    this.selectedNode.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      takeUntil(this.destroy$),
      filter(attributes => attributes.length > 0),
    ).subscribe(attributes => {
      const fromAttribute = attributes.find(attr => attr.editorName === AttributeNames.linkFromAttribute);
      if (fromAttribute) {
        fromAttribute.value$.pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged()
        ).subscribe(value => {
          this.fromAttributeFormControl.setValue(value, { emitEvent: false });
        });
      }
    });
  }

  setupToAttributeModelToFormBindings() {
    this.selectedNode.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      takeUntil(this.destroy$),
      filter(attributes => attributes.length > 0),
    ).subscribe(attributes => {
      const toAttribute = attributes.find(attr => attr.editorName === AttributeNames.linkToAttribute);
      if (toAttribute) {
        toAttribute.value$.pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged()
        ).subscribe(value => {
          this.toAttributeFormControl.setValue(value, { emitEvent: false });
        });
      }
    });
  }

  private setupInitialValues() {
    this.showOnlyLookups$ = this.showOnlyLookupsFormControl.valueChanges.pipe(
      startWith(this.showOnlyLookupsFormControl.value), shareReplay(1)
    );

    const linkType = this.getAttribute(AttributeData.Link.Type, this.selectedNode);
    if (linkType) {
      this.linkTypeFormControl.setValue(linkType.value$.value, { emitEvent: false });
    }

    const alias = this.getAttribute(AttributeData.Link.Alias, this.selectedNode);
    if (alias) {
      this.aliasFormControl.setValue(alias.value$.value, { emitEvent: false });
    }

    const intersect = this.getAttribute(AttributeData.Link.Intersect, this.selectedNode);
    if (intersect) {
      this.intersectFormControl.setValue(intersect.value$.value === 'true', { emitEvent: false });
    }

    const visible = this.getAttribute(AttributeData.Link.Visible, this.selectedNode);
    if (visible) {
      this.visibleFormControl.setValue(visible.value$.value === 'true', { emitEvent: false });
    }
  }

  private setupEntityAutocomplete() {
    this.filteredEntities$ = combineLatest([
      this.entityNameFormControl.valueChanges.pipe(startWith(this.entityNameFormControl.value || '')),
      this.entityService.getEntities()
    ]).pipe(
      map(([value, entities]) => this.filterEntities(value, entities))
    );
  }

  private setupFromAttributeAutocomplete() {
    const attributes$ = this.selectedNode.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      filter(attributes => attributes.length > 0),
      map(attributes => attributes.find(attr => attr.editorName === AttributeNames.linkEntity)),
      takeUntil(this.destroy$),
      switchMap(entityAttribute => {
        if (!entityAttribute) { return of([] as AttributeModel[]) };
        return entityAttribute.validationResult$.pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged((prev, curr) => prev.isValid === curr.isValid),
          switchMap(validationResult => {
            if (!validationResult) { return of([] as AttributeModel[]) }
            return entityAttribute.value$.pipe(
              takeUntil(this.destroy$),
              distinctUntilChanged(),
              switchMap(entityName => this.attributeService.getAttributes(entityName)),
              catchError(error => {
                console.error(`[LinkEntityFormComponent] Error fetching attributes`, error);
                return of([] as AttributeModel[]);
              })
            );
          })
        )
      })
    );

    const fromAttributeInput$ = this.fromAttributeFormControl.valueChanges.pipe(
      startWith(this.fromAttributeFormControl.value || '')
    );

    this.filteredFromAttributes$ = combineLatest([
      fromAttributeInput$,
      attributes$,
      this.showOnlyLookups$
    ]).pipe(
      map(([value, attributes, showOnlyLookups]) => this.filterAttributes(value, attributes, showOnlyLookups))
    );
  }

  private setupToAttributeAutocomplete() {
    const parentNode = this.selectedNode.getParentEntity();
    if (!parentNode || parentNode.validationResult$.pipe(take(1)).subscribe(result => !result.isValid)) {
      this.filteredToAttributes$ = of([]);
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

    const toAttributeInput$ = this.toAttributeFormControl.valueChanges.pipe(
      startWith(this.toAttributeFormControl.value || '')
    );

    this.filteredToAttributes$ = combineLatest([
      toAttributeInput$,
      parentEntityAttribute$,
      this.showOnlyLookups$
    ]).pipe(
      map(([value, attributes, showOnlyLookups]) => this.filterAttributes(value, attributes, showOnlyLookups))
    );
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
      filtered = filtered.filter(attr => attr.attributeType === AttributeType.LOOKUP);
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