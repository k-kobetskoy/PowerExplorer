import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, takeUntil } from 'rxjs/operators';
import { EntityEntityService } from '../../../services/entity-services/entity-entity.service';

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
    loading$ = new BehaviorSubject<boolean>(false);

    constructor(
        private entityService: EntityEntityService,
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
        // Create form group with controls for each attribute
        this.entityForm = this.fb.group({
            name: [this.getAttributeValue(this.AttributeData.Entity.Name)],
            alias: [this.getAttributeValue(this.AttributeData.Entity.Alias)]
        });

        // Setup entity autocomplete
        this.setupEntityAutocomplete();
        
        // Subscribe to form value changes
        this.entityForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(formValues => {
                // Process each form control value
                Object.entries(formValues).forEach(([key, value]) => {
                    const stringValue = value !== null && value !== undefined ? String(value) : '';
                    
                    // Find the corresponding attribute
                    const attribute = Object.values(this.AttributeData.Entity)
                        .find(attr => attr.EditorName === key);
                    
                    if (attribute) {
                        // Only update if the value has changed
                        const currentValue = this.getAttributeValue(attribute);
                        if (currentValue !== stringValue) {
                            this.updateAttribute(attribute, stringValue);
                            
                            // Special handling for entity name to update entitySetName
                            if (key === 'name') {
                                this.updateEntitySetName(stringValue);
                            }
                        }
                    }
                });
            });
    }

    private updateEntitySetName(entityName: string) {
        if (!entityName) return;
        
        this.entityService.getEntities()
            .pipe(
                map(entities => entities.find(e => e.logicalName === entityName)),
                takeUntil(this.destroy$)
            )
            .subscribe(entity => {
                if (entity) {
                    this.selectedNode.entitySetName$.next(entity.entitySetName);
                }
            });
    }

    private setupEntityAutocomplete() {
        this.filteredEntities$ = combineLatest([
            this.entityForm.get('name').valueChanges.pipe(startWith(this.entityForm.get('name').value || '')),
            this.entityService.getEntities()
        ]).pipe(
            debounceTime(300),
            distinctUntilChanged(),
            map(([value, entities]) => this.filterEntities(value, entities))
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
