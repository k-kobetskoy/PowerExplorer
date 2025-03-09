import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { EMPTY, Observable, Subject, combineLatest } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { EntityEntityService } from '../../../services/entity-services/entity-entity.service';
import { AttributeData } from '../../../models/constants/attribute-data';
import { QueryNode } from '../../../models/query-node';

@Component({
    selector: 'app-entity-form',
    templateUrl: './entity-form.component.html',
    styleUrls: ['./entity-form.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class EntityFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
    private destroy$ = new Subject<void>();
    entityForm: FormGroup;
    filteredEntities$: Observable<EntityModel[]>;

    private nameAttributeData = AttributeData.Entity.Name;
    private aliasAttributeData = AttributeData.Entity.Alias;

    private nameInputName = 'name';
    private aliasInputName = 'alias';

    constructor(private entityService: EntityEntityService, private fb: FormBuilder) { super(); }

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
        this.entityForm = this.fb.group({
            [this.nameInputName]: [''],
            [this.aliasInputName]: ['']
        });

        // Form input -> model
        this.setupFormToModelBindings();

        this.setupEntityAutocomplete();

        // Model -> Form input
        this.setupModelToFormBindings(this.selectedNode);
    }

    private setupFormToModelBindings() {
        const controls = [
            { control: this.nameInputName, attribute: this.nameAttributeData, hasSetName: true },
            { control: this.aliasInputName, attribute: this.aliasAttributeData, hasSetName: false }
        ];
 
        controls.forEach(({ control, attribute, hasSetName }) => {
            this.entityForm.get(control).valueChanges.pipe(
                debounceTime(50),
                takeUntil(this.destroy$),
                distinctUntilChanged()
            ).subscribe(value => {
                const stringValue = value !== null && value !== undefined ? String(value) : '';
                this.updateAttribute(attribute, stringValue);
 
                if (hasSetName) {
                    if (stringValue) {
                        this.updateEntitySetName(stringValue);
                    } else if (this.selectedNode) {
                        this.selectedNode.entitySetName$.next(null);
                    }
                }
            });
        });
    }

    private setupModelToFormBindings(selectedNode: QueryNode) {
        const controlBindings = [
            { editorName: this.nameAttributeData.EditorName, control: this.nameInputName },
            { editorName: this.aliasAttributeData.EditorName, control: this.aliasInputName }
        ];
 
        selectedNode.attributes$.pipe(
            takeUntil(this.destroy$),
            filter(attributes => attributes.length > 0),
            distinctUntilChanged()
        ).subscribe(attributes => {
            controlBindings.forEach(({ editorName, control }) => {
                const attr = attributes.find(a => a.editorName === editorName);
                if (attr) {
                    attr.value$.pipe(
                        takeUntil(this.destroy$),
                        distinctUntilChanged()
                    ).subscribe(value => {
                        const formValue = this.entityForm.get(control).value;
                        if (formValue !== value) {
                            this.entityForm.get(control).setValue(value, { emitEvent: false });
                        }
                    });
                }
            });
        });
    }

    private updateEntitySetName(entityName: string) {
        if (!entityName) return;

        this.entityService.getEntities()
            .pipe(
                map(entities => entities.find(e => e.logicalName === entityName)),
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('[EntityFormComponent] Error updating entity set name:', error);
                    return EMPTY;
                })
            )
            .subscribe(entity => {
                if (entity) {
                    this.selectedNode.entitySetName$.next(entity.entitySetName);
                }
            });
    }

    private setupEntityAutocomplete() {
        this.filteredEntities$ = combineLatest([
            this.entityForm.get(this.nameInputName).valueChanges.pipe(startWith(this.entityForm.get(this.nameInputName).value || '')),
            this.entityService.getEntities()
        ]).pipe(
            debounceTime(50),
            distinctUntilChanged(),
            map(([value, entities]) => this.filterEntities(value, entities)),
            takeUntil(this.destroy$)
        );
    }

    private filterEntities(value: string, entities: EntityModel[]): EntityModel[] {
        const filterValue = value?.toLowerCase() || '';
        return entities.filter(entity =>
            entity.logicalName.toLowerCase().includes(filterValue) ||
            entity.displayName.toLowerCase().includes(filterValue)
        );
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
