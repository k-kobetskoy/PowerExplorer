import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, Input, Inject } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EntityModel } from 'src/app/models/incoming/environment/entity-model';
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, takeUntil, tap } from 'rxjs/operators';
import { EntityEntityService } from '../../../services/entity-services/entity-entity.service';
import { AttributeData } from '../../../models/constants/attribute-data';
import { QueryNode } from '../../../models/query-node';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { QuickActionsComponent } from '../quick-actions/quick-actions.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { NodeTreeService } from '../../../services/node-tree.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NodeActionsComponent } from '../node-actions/node-actions.component';
import { ACTIVE_ENVIRONMENT_MODEL, ACTIVE_ACCOUNT_MODEL } from 'src/app/models/tokens';
import { EnvironmentModel } from 'src/app/models/environment-model';
import { AccountInfo } from '@azure/msal-browser';
@Component({
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatOptionModule,
        QuickActionsComponent,
        MatIconModule,
        MatButtonModule,
        FormsModule,
        MatProgressSpinnerModule,
        NodeActionsComponent
    ],
    selector: 'app-entity-form',
    templateUrl: './entity-form.component.html',
    styleUrls: ['./entity-form.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class EntityFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
    dublicateNode() {
        throw new Error('Method not implemented.');
    }
    private destroy$ = new Subject<void>();
    @Input() selectedNode: QueryNode;
    entityForm: FormGroup;
    filteredEntities$: Observable<EntityModel[]>;

    isLoading$: Observable<boolean>;

    private nameAttributeData = AttributeData.Entity.Name;

    private nameInputName = this.nameAttributeData.EditorName;

    constructor(
        private entityService: EntityEntityService,
        private fb: FormBuilder,
        private nodeTreeProcessorService: NodeTreeService,
        @Inject(ACTIVE_ENVIRONMENT_MODEL) private activeEnvironmentModel: BehaviorSubject<EnvironmentModel>,
        @Inject(ACTIVE_ACCOUNT_MODEL) private activeAccount: BehaviorSubject<AccountInfo>
    ) {
        super();
        // this.isLoading$ = this.entityService.getEntitiesIsLoading$;
    }

    ngOnInit() {
        this.initializeForm();
        this.initializeIsLoading();
    }

    initializeIsLoading() {
       combineLatest([this.activeEnvironmentModel, this.activeAccount]).pipe(
        takeUntil(this.destroy$),
        filter(([environment, account]) => environment !== null && environment !== undefined && account !== null && account !== undefined),
        startWith(false)     
       ).subscribe(isLoggedIn => {
        if(isLoggedIn) {
            this.isLoading$ = this.entityService.getEntitiesIsLoading$;
        }
       });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['selectedNode'] && this.selectedNode) {
            this.destroy$.next();
            this.initializeForm();
        }
    }

    removeNode() {
        this.nodeTreeProcessorService.removeNode(this.selectedNode);
    }

    private initializeForm() {
        const nameAttribute = this.getAttribute(this.nameAttributeData, this.selectedNode);

        this.entityForm = this.fb.group({
            [this.nameAttributeData.EditorName]: [nameAttribute || '']
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
    }

    private setupModelToFormBindings() {
        const controlBindings = [
            { editorName: this.nameAttributeData.EditorName, control: this.nameInputName }
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
            this.entityService.getEntities(true)
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
