import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, Input, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, takeUntil, tap } from 'rxjs/operators';
import { QueryNode } from '../../../models/query-node';
import { QuickActionsComponent } from '../quick-actions/quick-actions.component';
import { EntityEntityService } from '../../../services/entity-services/entity-entity.service';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { AttributeData } from '../../../models/constants/attribute-data';
import { TuiHint } from '@taiga-ui/core';
import { TuiInputModule } from '@taiga-ui/legacy';

// Taiga UI imports
import { TUI_ICON_RESOLVER } from '@taiga-ui/core';
import { iconResolver } from 'src/app/app.module';

@Component({
    standalone: true,
    selector: 'app-entity-form',
    templateUrl: './entity-form.component.html',
    styles: [`
        .form-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
        }
        .form-field {
            width: 100%;
            margin-bottom: 1rem;
        }
        .form-field label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        .form-input, .form-select {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 1rem;
        }
        .entity-search {
            position: relative;
        }
        .entity-results {
            position: absolute;
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
            background: white;
            border: 1px solid #ccc;
            border-top: none;
            border-radius: 0 0 4px 4px;
            z-index: 10;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: -1px;
        }
        .entity-item {
            padding: 0.5rem;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }
        .entity-item:hover {
            background-color: #f5f5f5;
        }
        .entity-item:last-child {
            border-bottom: none;
        }
        .entity-name {
            font-weight: 500;
        }
        .entity-display-name {
            font-size: 0.85rem;
            color: #666;
        }
        .loading-indicator {
            text-align: center;
            padding: 0.5rem;
            color: #666;
        }
        .no-results {
            padding: 0.5rem;
            color: #666;
            text-align: center;
            font-style: italic;
        }
    `],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        QuickActionsComponent,
        TuiInputModule
    ],
    schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
    providers: [
        {
            provide: TUI_ICON_RESOLVER,
            useFactory: iconResolver
        }
    ]
})
export class EntityFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
    private destroy$ = new Subject<void>();
    @Input() selectedNode: QueryNode;
    entityForm: FormGroup;
    filteredEntities$: Observable<EntityModel[]>;
    allEntities: EntityModel[] = [];
    isLoading = false;
    showResults = false;
    public nameInputName = 'name';
    private nameAttributeData = AttributeData.Entity.Name;
    constructor(
        private cdr: ChangeDetectorRef,
        private entityService: EntityEntityService
    ) {
         super();
     }
    ngOnInit() {
        this.initializeForm();
        this.loadEntities();
        this.cdr.detectChanges();
    }
    ngOnChanges(changes: SimpleChanges) {
        if (changes['selectedNode'] && this.selectedNode) {
            this.initializeForm();
            this.cdr.detectChanges();
        }
    }
    private initializeForm() {
        // Set initial form value from model
        const nameAttribute = this.getAttribute(this.nameAttributeData, this.selectedNode);
        if (nameAttribute && nameAttribute.value$) {
            const value = nameAttribute.value$.value;
            this.entityForm.get(this.nameInputName).setValue(value || '', { emitEvent: false });
        }
        // Setup form to model binding
        this.setupFormToModelBinding();
        // Setup filtering
        this.setupEntityFiltering();
    }
    private setupFormToModelBinding() {
        this.entityForm.get(this.nameInputName).valueChanges.pipe(
            distinctUntilChanged(),
            debounceTime(300),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(this.nameAttributeData, this.selectedNode, value);
        });
    }
    private loadEntities() {
        this.isLoading = true;
        this.entityService.getEntities().pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (entities) => {
                this.allEntities = entities || [];
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading entities:', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }
    private setupEntityFiltering() {
        this.filteredEntities$ = combineLatest([
            this.entityForm.get(this.nameInputName).valueChanges.pipe(
                startWith(this.entityForm.get(this.nameInputName).value || '')
            ),
            of(this.allEntities).pipe(
                tap(() => this.isLoading = false)
            )
        ]).pipe(
            debounceTime(300),
            map(([searchTerm, entities]) => {
                const search = (searchTerm || '').toLowerCase();
                if (!search) return entities.slice(0, 20); // Show first 20 entities if no search term
                return entities.filter(entity =>
                    entity.logicalName.toLowerCase().includes(search) ||
                    entity.displayName.toLowerCase().includes(search)
                ).slice(0, 20); // Limit to 20 results
            })
        );
    }
    selectEntity(entity: EntityModel) {
        this.entityForm.get(this.nameInputName).setValue(entity.logicalName);
        this.showResults = false;
        this.cdr.detectChanges();
    }
    onInputFocus() {
        this.showResults = true;
        this.cdr.detectChanges();
    }
    onInputBlur() {
        // Delay hiding results slightly to allow for selection
        setTimeout(() => {
            this.showResults = false;
            this.cdr.detectChanges();
        }, 200);
    }
    // Helper method to get form control
    getFormControl(name: string): FormControl {
        return this.entityForm.get(name) as FormControl;
    }
    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}