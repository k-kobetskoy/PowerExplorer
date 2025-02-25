import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormControl } from '@angular/forms';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, takeUntil } from 'rxjs/operators';
import { EntityEntityService } from '../../../services/entity-services/entity-entity.service';

@Component({
    selector: 'app-entity-form',
    templateUrl: './entity-form.component.html',
    styleUrls: ['./entity-form.component.css']
})
export class EntityFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
    private destroy$ = new Subject<void>();
    private storedValues = new Map<string, string>();
    entityFormControl = new FormControl('');
    filteredEntities$: Observable<EntityModel[]>;
    loading$ = new BehaviorSubject<boolean>(false);

    constructor(private entityService: EntityEntityService) {
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
        this.setupEntityAutocomplete();
        this.setupNodeValueHandling();
    }

    private setupNodeValueHandling() {
        // When node changes, load its stored value or attribute value
        const nodeId = this.selectedNode.id;
        if (this.storedValues.has(nodeId)) {
            this.entityFormControl.setValue(this.storedValues.get(nodeId), { emitEvent: false });
        } else {
            const entityName = this.getAttributeValue(this.AttributeData.Entity.Name);
            if (entityName) {
                this.entityFormControl.setValue(entityName, { emitEvent: false });
                this.storedValues.set(nodeId, entityName);
            }
        }

        // Subscribe to form control changes
        this.entityFormControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => {
                // Store value for this node
                this.storedValues.set(this.selectedNode.id, value);
                
                this.updateAttribute(this.AttributeData.Entity.Name, value);
                // Update entitySetName if entity exists
                this.entityService.getEntities()
                    .pipe(
                        map(entities => entities.find(e => e.logicalName === value)),
                        takeUntil(this.destroy$)
                    )
                    .subscribe(entity => {
                        if (entity) {
                            this.selectedNode.entitySetName$.next(entity.entitySetName);
                        }
                    });
            });
    }

    private setupEntityAutocomplete() {
        this.filteredEntities$ = combineLatest([
            this.entityFormControl.valueChanges.pipe(startWith('')),
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
