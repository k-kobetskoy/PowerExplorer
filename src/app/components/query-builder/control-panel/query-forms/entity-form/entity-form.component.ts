import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, Input } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { Observable, Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, takeUntil } from 'rxjs/operators';
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
    @Input() selectedNode: QueryNode;
    entityForm: FormGroup;
    filteredEntities$: Observable<EntityModel[]>;

    private nameAttributeData = AttributeData.Entity.Name;
    private aliasAttributeData = AttributeData.Entity.Alias;

    private nameInputName = this.nameAttributeData.EditorName;
    private aliasInputName = this.aliasAttributeData.EditorName;

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
        const nameAttribute = this.getAttribute(this.nameAttributeData, this.selectedNode);
        const aliasAttribute = this.getAttribute(this.aliasAttributeData, this.selectedNode);

        this.entityForm = this.fb.group({
            [this.nameAttributeData.EditorName]: [nameAttribute || ''],
            [this.aliasAttributeData.EditorName]: [aliasAttribute || '']
        });

        // Form input -> model
        this.setupFormToModelBindings();

        this.setupEntityAutocomplete();

        // Model -> Form input
        this.setupModelToFormBindings();
    }

    private setupFormToModelBindings() {
        this.entityForm.get(this.nameInputName).valueChanges.pipe(
            distinctUntilChanged(),
            debounceTime(50),
            takeUntil(this.destroy$),
        ).subscribe(value => {
            this.updateAttribute(this.nameAttributeData, this.selectedNode, value);
        });

        this.entityForm.get(this.aliasInputName).valueChanges.pipe(
            distinctUntilChanged(),
            debounceTime(50),
            takeUntil(this.destroy$),
        ).subscribe(value => {
            this.updateAttribute(this.aliasAttributeData, this.selectedNode, value);
        });
    }

    private setupModelToFormBindings() {
        const controlBindings = [
            { editorName: this.nameAttributeData.EditorName, control: this.nameInputName },
            { editorName: this.aliasAttributeData.EditorName, control: this.aliasInputName }
        ];

        this.selectedNode.attributes$.pipe(
            takeUntil(this.destroy$),
            filter(attributes => attributes.length > 0),
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

    private setupEntityAutocomplete() {
        this.filteredEntities$ = combineLatest([
            this.entityForm.get(this.nameInputName).valueChanges.pipe(startWith(this.entityForm.get(this.nameInputName).value || '')),
            this.entityService.getEntities()
        ]).pipe(
            debounceTime(50),
            distinctUntilChanged((prev, curr) => prev.every((value, index) => value === curr[index])),
            map(([value, entities]) => this.filterEntities(value, entities)),
            takeUntil(this.destroy$)
        );
    }

    private filterEntities(value: string, entities: EntityModel[]): EntityModel[] {
        const filterValue = value || '';
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
