import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, Input } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormControl } from '@angular/forms';
import { Observable, Subject, combineLatest, of, shareReplay, tap } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap, takeUntil, filter, catchError, take } from 'rxjs/operators';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { EntityEntityService } from '../../../services/entity-services/entity-entity.service';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { LinkTypeOptions } from '../../../models/constants/ui/link-type-options';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';
import { AttributeNames } from '../../../models/constants/attribute-names';
import { LinkEntityService } from '../../../services/entity-services/link-entity.service';
import { LinkEntityResponseModel, RelationshipModel, RelationshipType } from 'src/app/models/incoming/link/link-entity-response-model';

// Interface for relation object to improve type safety
interface RelationObject extends RelationshipModel { }

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

    /* New styles for relationship dropdown */
    .relationship-option {
      display: flex;
      flex-direction: column;
      padding: 4px 0;
    }

    .entity-name {
      font-weight: 500;
      font-size: 14px;
      color: #333;
    }

    .relation-name {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 2px;
    }

    .info-message {
      margin-bottom: 15px; 
      padding: 10px; 
      background-color: #f8f9fa; 
      border-radius: 4px; 
      border-left: 4px solid #17a2b8;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkEntityFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  @Input() selectedNode: QueryNode;

  private destroy$ = new Subject<void>();

  readonly linkTypes = LinkTypeOptions;

  entityNameFormControl = new FormControl<string | null>('');
  linkEntityFormControl = new FormControl<string | RelationshipModel | null>('');
  fromAttributeFormControl = new FormControl<string | null>('');
  toAttributeFormControl = new FormControl<string | null>('');
  linkTypeFormControl = new FormControl<string | null>('');
  aliasFormControl = new FormControl<string | null>('');
  intersectFormControl = new FormControl<boolean>(false);
  visibleFormControl = new FormControl<boolean>(false);
  fetchAllEntitiesFormControl = new FormControl<boolean>(false);

  // Observables for autocomplete
  filteredEntities$: Observable<EntityModel[]>; // New entity to link to 
  filteredFromAttributes$: Observable<AttributeModel[]>; // From attribute of the new entity
  filteredToAttributes$: Observable<AttributeModel[]>; // To attribute of the parent entity
  filteredLinkEntities$: Observable<LinkEntityResponseModel>;

  entities$: Observable<EntityModel[]>;
  fromAttributes$: Observable<AttributeModel[]>;
  toAttributes$: Observable<AttributeModel[]>;

  linkEntities$: Observable<LinkEntityResponseModel>;
  fetchAllEntities$: Observable<boolean>;
  parentEntityLogicalName$: Observable<string>;

  constructor(
    private entityService: EntityEntityService,
    private linkEntityService: LinkEntityService,
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

    this.fetchAllEntities$ = this.fetchAllEntitiesFormControl.valueChanges.pipe(
      startWith(this.fetchAllEntitiesFormControl.value),
      takeUntil(this.destroy$)
    );

    this.setupLinkEntitiesObservable();
    this.subscribeOnLinkEntityFormControlValidityState();
    this.subscribeOnFetchAllEntitiesFormControlChanges();

    this.setupEntityAutocomplete();
    this.setupLinkEntityAutocomplete();
    this.setupFromAttributeAutocomplete();
    this.setupToAttributeAutocomplete();

    this.setupFormToModelBindings();
  }

  subscribeOnFetchAllEntitiesFormControlChanges() {
    this.fetchAllEntitiesFormControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(fetchAll => {
      if (this.fetchAllEntitiesFormControl.dirty) {
        this.updateAttribute(AttributeData.Link.FetchAllEntities, this.selectedNode, fetchAll.toString());
        
        this.clearAllAttributes();
      }
    });
  }
  clearAllAttributes() {
    // Clear all form values
    this.entityNameFormControl.setValue(null, { emitEvent: true });
    this.linkEntityFormControl.setValue(null, { emitEvent: true });
    this.fromAttributeFormControl.setValue(null, { emitEvent: true });
    this.toAttributeFormControl.setValue(null, { emitEvent: true });
    this.linkTypeFormControl.setValue(null, { emitEvent: true });
    this.aliasFormControl.setValue(null, { emitEvent: true });
    
    // Mark controls as dirty to ensure changes get propagated
    this.entityNameFormControl.markAsDirty();
    this.linkEntityFormControl.markAsDirty();
    this.fromAttributeFormControl.markAsDirty();
    this.toAttributeFormControl.markAsDirty();
    this.linkTypeFormControl.markAsDirty();
    this.aliasFormControl.markAsDirty();
  }

  subscribeOnLinkEntityFormControlValidityState() {
    this.linkEntityFormControl.valueChanges.pipe(
      filter(() => this.linkEntityFormControl.dirty),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (value && typeof value === 'object') {
        this.handleFullRelationObject(value);
      }
    });
  }

  setupLinkEntitiesObservable() {
    const parentEntity = this.selectedNode.getParentEntity();

    if (!parentEntity) {
      this.linkEntities$ = of({ OneToManyRelationships: [], ManyToOneRelationships: [] });
      this.parentEntityLogicalName$ = of('');

      if (!this.fetchAllEntitiesFormControl.value) {
        this.fetchAllEntitiesFormControl.setValue(true, { emitEvent: true });
      }
      return;
    }

    let isParentValid = false;
    parentEntity.validationResult$.pipe(take(1)).subscribe(result => {
      isParentValid = result.isValid;
    });

    if (!isParentValid) {
      this.linkEntities$ = of({ OneToManyRelationships: [], ManyToOneRelationships: [] });
      this.parentEntityLogicalName$ = of('');

      if (!this.fetchAllEntitiesFormControl.value) {
        this.fetchAllEntitiesFormControl.setValue(true, { emitEvent: true });
      }
      return;
    }

    this.parentEntityLogicalName$ = parentEntity.attributes$.pipe(
      take(1),
      map(attributes => {
        const entityNameAttr = attributes.find(attr => attr.editorName === AttributeNames.entityName);
        const name = entityNameAttr?.value$.value as string || '';
        return name;
      })
    );

    this.linkEntities$ = this.parentEntityLogicalName$.pipe(
      switchMap(entityName => {
        if (!entityName) {
          return of({ OneToManyRelationships: [], ManyToOneRelationships: [] });
        }
        return this.linkEntityService.getLinkEntities(entityName).pipe(
        );
      })
    );
  }

  private setupLinkEntityAutocomplete() {
    this.filteredLinkEntities$ = combineLatest([
      this.linkEntityFormControl.valueChanges.pipe(startWith(this.linkEntityFormControl.value || '')),
      this.linkEntities$,
    ]).pipe(
      map(([searchTerm, linkEntities]) => {
        if (!searchTerm || typeof searchTerm !== 'string') {
          return linkEntities;
        }

        const searchTermLower = searchTerm.toLowerCase();

        const filteredOneToMany = linkEntities.OneToManyRelationships
          .filter(rel =>
            rel.ReferencingEntityName.toLowerCase().includes(searchTermLower) ||
            rel.SchemaName.toLowerCase().includes(searchTermLower)
          );

        const filteredManyToOne = linkEntities.ManyToOneRelationships
          .filter(rel =>
            rel.ReferencedEntityName.toLowerCase().includes(searchTermLower) ||
            rel.SchemaName.toLowerCase().includes(searchTermLower)
          );

        return {
          OneToManyRelationships: filteredOneToMany,
          ManyToOneRelationships: filteredManyToOne
        };
      }),
      tap(filtered => {
        console.log('Filtered link entities:', {
          oneToManyCount: filtered.OneToManyRelationships?.length || 0,
          manyToOneCount: filtered.ManyToOneRelationships?.length || 0
        });
      })
    );
  }

  private setupFormToModelBindings() {
    this.entityNameFormControl.valueChanges.pipe(
      filter(() => this.entityNameFormControl.dirty),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateAttribute(AttributeData.Link.Entity, this.selectedNode, value);
    });

    this.linkEntityFormControl.valueChanges.pipe(
      filter(() => this.linkEntityFormControl.dirty),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (!value) {
        this.updateAttribute(AttributeData.Link.Entity, this.selectedNode, '');
        return;
      }

      if (typeof value === 'object') {
        const relation = value as RelationshipModel;
        let entityName = '';

        if (relation.RelationshipType === RelationshipType.OneToMany) {
          entityName = relation.ReferencingEntityName;
        } else if (relation.RelationshipType === RelationshipType.ManyToOne) {
          entityName = relation.ReferencedEntityName;
        }

        this.updateAttribute(AttributeData.Link.Entity, this.selectedNode, entityName);
      } else {
        this.updateAttribute(AttributeData.Link.Entity, this.selectedNode, String(value));
      }
    });

    this.fromAttributeFormControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateAttribute(AttributeData.Link.From, this.selectedNode, value);
    });

    this.toAttributeFormControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateAttribute(AttributeData.Link.To, this.selectedNode, value);
    });

    this.linkTypeFormControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateAttribute(AttributeData.Link.Type, this.selectedNode, value);
    });

    this.aliasFormControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateAttribute(AttributeData.Link.Alias, this.selectedNode, value);
    });

    this.intersectFormControl.valueChanges.pipe(
      filter(() => this.intersectFormControl.dirty),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateAttribute(AttributeData.Link.Intersect, this.selectedNode, value.toString());
    });

    this.visibleFormControl.valueChanges.pipe(
      filter(() => this.visibleFormControl.dirty),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateAttribute(AttributeData.Link.Visible, this.selectedNode, value.toString());
    });
  }

  private setupInitialValues() {
    const fetchAllEntities = this.getAttribute(AttributeData.Link.FetchAllEntities, this.selectedNode);
    if (fetchAllEntities) {
      this.fetchAllEntitiesFormControl.setValue(fetchAllEntities.value$.value === 'true', { emitEvent: false });
    } else {
      this.fetchAllEntitiesFormControl.setValue(false, { emitEvent: false });
    }

    this.entityNameFormControl.setValue(null, { emitEvent: false });
    this.linkEntityFormControl.setValue(null, { emitEvent: false });
    this.fromAttributeFormControl.setValue(null, { emitEvent: false });
    this.toAttributeFormControl.setValue(null, { emitEvent: false });
    this.linkTypeFormControl.setValue(null, { emitEvent: false });
    this.aliasFormControl.setValue(null, { emitEvent: false });
    this.intersectFormControl.setValue(false, { emitEvent: false });
    this.visibleFormControl.setValue(false, { emitEvent: false });

    const entityName = this.getAttribute(AttributeData.Link.Entity, this.selectedNode);
    if (entityName && entityName.value$.value) {
      this.entityNameFormControl.setValue(entityName.value$.value, { emitEvent: false });
      this.linkEntityFormControl.setValue(entityName.value$.value, { emitEvent: false });
    }

    const fromAttribute = this.getAttribute(AttributeData.Link.From, this.selectedNode);
    if (fromAttribute && fromAttribute.value$.value) {
      this.fromAttributeFormControl.setValue(fromAttribute.value$.value, { emitEvent: false });
    }

    const toAttribute = this.getAttribute(AttributeData.Link.To, this.selectedNode);
    if (toAttribute && toAttribute.value$.value) {
      this.toAttributeFormControl.setValue(toAttribute.value$.value, { emitEvent: false });
    }

    const linkType = this.getAttribute(AttributeData.Link.Type, this.selectedNode);
    if (linkType && linkType.value$.value) {
      this.linkTypeFormControl.setValue(linkType.value$.value, { emitEvent: false });
    }

    const alias = this.getAttribute(AttributeData.Link.Alias, this.selectedNode);
    if (alias && alias.value$.value) {
      this.aliasFormControl.setValue(alias.value$.value, { emitEvent: false });
    }

    const intersect = this.getAttribute(AttributeData.Link.Intersect, this.selectedNode);
    if (intersect && intersect.value$.value) {
      this.intersectFormControl.setValue(intersect.value$.value === 'true', { emitEvent: false });
    }

    const visible = this.getAttribute(AttributeData.Link.Visible, this.selectedNode);
    if (visible && visible.value$.value) {
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
    ]).pipe(
      map(([value, attributes]) => this.filterAttributes(value, attributes))
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
    ]).pipe(
      map(([value, attributes]) => this.filterAttributes(value, attributes))
    );
  }

  private filterEntities(value: string, entities: EntityModel[]): EntityModel[] {
    const filterValue = value?.toLowerCase() || '';
    return entities.filter(entity =>
      entity.logicalName.toLowerCase().includes(filterValue) ||
      entity.displayName.toLowerCase().includes(filterValue)
    );
  }

  private filterAttributes(value: string, attributes: AttributeModel[]): AttributeModel[] {
    const filterValue = value?.toLowerCase() || '';
    return attributes.filter(attr =>
      attr.logicalName.toLowerCase().includes(filterValue) ||
      attr.displayName.toLowerCase().includes(filterValue)
    );
  }

  displayEntityName(relation: RelationshipModel | string | null): string {
    if (!relation) {
      return '';
    }

    if (typeof relation === 'string') {
      return relation;
    }

    if (relation.RelationshipType === RelationshipType.OneToMany) {
      return relation.ReferencingEntityName;
    } else if (relation.RelationshipType === RelationshipType.ManyToOne) {
      return relation.ReferencedEntityName;
    }

    return '';
  }

  private handleFullRelationObject(relation: RelationshipModel): void {
    if (relation.SchemaName) {

      if (relation.RelationshipType === RelationshipType.OneToMany) {
        if (relation.ReferencingAttribute) {
          this.fromAttributeFormControl.setValue(relation.ReferencingAttribute);
        }

        if (relation.ReferencedAttribute) {
          this.toAttributeFormControl.setValue(relation.ReferencedAttribute);
        }
        // Set alias name if needed
        //this.aliasFormControl.setValue(this.getAliasName(relation.ReferencingEntityName, relation.ReferencedAttribute));

      } else if (relation.RelationshipType === RelationshipType.ManyToOne) {

        if (relation.ReferencedAttribute) {
          this.fromAttributeFormControl.setValue(relation.ReferencedAttribute);
        }

        if (relation.ReferencingAttribute) {
          this.toAttributeFormControl.setValue(relation.ReferencingAttribute);
        }
        // Set alias name if needed 
        //this.aliasFormControl.setValue(this.getAliasName(relation.ReferencedEntityName, relation.ReferencingAttribute));
      }
    }
  }
  getAliasName(ReferencingEntityName: string, ReferencedAttribute: string): string {
    return `${ReferencingEntityName.substring(0, 2).toLocaleUpperCase()}_${ReferencedAttribute.substring(0, 2).toLocaleUpperCase()}`;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}