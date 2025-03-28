import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, combineLatest, of, catchError, filter } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { BaseFormComponent } from '../base-form.component';
import { AttributeData } from '../../../models/constants/attribute-data';
import { QueryNode } from '../../../models/query-node';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { QuickActionsComponent } from '../quick-actions/quick-actions.component';
import { LoadingIndicatorComponent } from 'src/app/components/loading-indicator/loading-indicator.component';
import { MatIconModule } from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {FormsModule} from '@angular/forms';
import { NodeTreeService } from '../../../services/node-tree.service';
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
    LoadingIndicatorComponent,
    MatIconModule,
    MatButtonModule,
    FormsModule
  ],    
  selector: 'app-attribute-form',
  templateUrl: './attribute-form.component.html',
  styleUrls: ['./attribute-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class AttributeFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  @Input() selectedNode: QueryNode;

  attributeForm: FormGroup;
  filteredAttributes$: Observable<AttributeModel[]>;

  private nameAttributeData = AttributeData.Attribute.Name;
  private aliasAttributeData = AttributeData.Attribute.Alias;

  private nameInputName = this.nameAttributeData.EditorName;
  private aliasInputName = this.aliasAttributeData.EditorName;

  constructor(
    private attributeService: AttributeEntityService,
    private fb: FormBuilder,
    private nodeTreeProcessorService: NodeTreeService
  ) {
    super();
  }

  ngOnInit() {
    this.initializeForm();
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
    this.attributeForm = this.fb.group({
      [this.nameInputName]: [''],
      [this.aliasInputName]: ['']
    });

    // Form input -> model
    this.setupFormToModelBindings();

    this.setupAttributeAutocomplete();

    // Model -> Form input
    this.setupModelToFormBindings(this.selectedNode);
  }

  private setupFormToModelBindings() {
    this.attributeForm.get(this.nameInputName).valueChanges.pipe(
      distinctUntilChanged(),
      debounceTime(50),
      takeUntil(this.destroy$),
    ).subscribe(value => {
      this.updateAttribute(this.nameAttributeData, this.selectedNode, value);
    });

    this.attributeForm.get(this.aliasInputName).valueChanges.pipe(
      distinctUntilChanged(),
      debounceTime(50),
      takeUntil(this.destroy$),
    ).subscribe(value => {
      this.updateAttribute(this.aliasAttributeData, this.selectedNode, value);
    });
  }

  private setupModelToFormBindings(selectedNode: QueryNode) {
    const controlBindings = [
      { editorName: this.nameInputName, control: this.nameInputName },
      { editorName: this.aliasInputName, control: this.aliasInputName }
    ];

    selectedNode.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
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
            const formValue = this.attributeForm.get(control).value;
            if (formValue !== value) {
              this.attributeForm.get(control).setValue(value, { emitEvent: false });
            }
          });
        }
      });
    });
  }

  private setupAttributeAutocomplete() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      this.filteredAttributes$ = of([]);
      return;
    }

    const parentEntityName$ = this.selectedNode.getParentEntityName(parentEntityNode)
      .pipe(distinctUntilChanged());

    const combinedParent$ = combineLatest([
      parentEntityName$.pipe(distinctUntilChanged()),
      parentEntityNode.validationResult$.pipe(distinctUntilChanged((prev, curr) => prev.isValid === curr.isValid))
    ])

    const validatedAttributes$ = combinedParent$.pipe(
      switchMap(([entityName, validationResult]) => {
        if (!validationResult.isValid) {
          return of([]);
        }

        return this.attributeService.getAttributes(entityName).pipe(
          map(attributes => {
            return attributes;
          }),
          catchError(error => {
            console.error(`[AttributeFormComponent] Error fetching attributes for entity: ${entityName}`, error);
            return of([]);
          })
        );
      })
    );

    this.filteredAttributes$ = combineLatest([
      this.attributeForm.get('name').valueChanges.pipe(
        startWith(this.attributeForm.get('name').value || '')
      ),
      validatedAttributes$
    ]).pipe(
      debounceTime(50),
      map(([value, attributes]) => {
        return this.filterAttributes(value, attributes);
      })
    );
  }

  private filterAttributes(value: string, attributes: AttributeModel[]): AttributeModel[] {
    const filterValue = value?.toLowerCase() || '';
    return attributes.filter(attr =>
      attr.logicalName.toLowerCase().includes(filterValue) ||
      attr.displayName.toLowerCase().includes(filterValue)
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}