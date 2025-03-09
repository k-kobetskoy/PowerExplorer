import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, combineLatest, of, catchError } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { BaseFormComponent } from '../base-form.component';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { NodeAttribute } from '../../../models/node-attribute';
import { AttributeData } from '../../../models/constants/attribute-data';

@Component({
  selector: 'app-attribute-form',
  templateUrl: './attribute-form.component.html',
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-field {
      width: 100%;
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

    mat-option {
      height: auto;
      line-height: 1.2;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  attributeForm: FormGroup;
  filteredAttributes$: Observable<AttributeModel[]>;
  loading = false;

  nameAttribute = AttributeData.Attribute.Name;
  aliasAttribute = AttributeData.Attribute.Alias;

  constructor(
    private attributeService: AttributeEntityService,
    private fb: FormBuilder,
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

  private initializeForm() {
    // Get or create attributes
    let nameAttr = this.getAttribute(this.nameAttribute);
    let aliasAttr = this.getAttribute(this.aliasAttribute);

    // Create form with initial values
    this.attributeForm = this.fb.group({
      name: [nameAttr?.value$.value || ''],
      alias: [aliasAttr?.value$.value || '']
    });

    // Setup reactive bindings and autocomplete
    this.setupReactiveBindings(nameAttr, aliasAttr);
    this.setupAttributeAutocomplete();
  }

  private setupReactiveBindings(nameAttr: NodeAttribute | undefined, aliasAttr: NodeAttribute | undefined) {
    // Create attributes if they don't exist
    if (!nameAttr) {
      this.updateAttribute(this.nameAttribute, '');
      nameAttr = this.getAttribute(this.nameAttribute);
    }

    if (!aliasAttr) {
      this.updateAttribute(this.aliasAttribute, '');
      aliasAttr = this.getAttribute(this.aliasAttribute);
    }

    // Set up two-way binding for name attribute
    if (nameAttr) {
      // Form to Attribute (user input)
      this.attributeForm.get('name').valueChanges.pipe(
        debounceTime(50),
        takeUntil(this.destroy$)
      ).subscribe(value => {
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        
        if (nameAttr.value$.value !== stringValue) {
          nameAttr.value$.next(stringValue);
        }
      });

      // Attribute to Form (programmatic updates)
      nameAttr.value$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(value => {
        const formValue = this.attributeForm.get('name').value;
        if (formValue !== value) {
          this.attributeForm.get('name').setValue(value, { emitEvent: false });
        }
      });
    }

    // Set up two-way binding for alias attribute
    if (aliasAttr) {
      // Form to Attribute (user input)
      this.attributeForm.get('alias').valueChanges.pipe(
        debounceTime(50),
        takeUntil(this.destroy$)
      ).subscribe(value => {
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        
        if (aliasAttr.value$.value !== stringValue) {
          aliasAttr.value$.next(stringValue);
        }
      });

      // Attribute to Form (programmatic updates)
      aliasAttr.value$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(value => {
        const formValue = this.attributeForm.get('alias').value;
        if (formValue !== value) {
          this.attributeForm.get('alias').setValue(value, { emitEvent: false });
        }
      });
    }
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent) {
    const selectedValue = event.option.value;
    console.debug(`[AttributeFormComponent] Attribute selected: ${selectedValue}`);
    
    // Get the name attribute and update its value
    const nameAttr = this.getAttribute(this.nameAttribute);
    if (nameAttr && nameAttr.value$.value !== selectedValue) {
      nameAttr.value$.next(selectedValue);
    }
  }

  private setupAttributeAutocomplete() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      console.warn('[AttributeFormComponent] Parent entity node not found');
      this.filteredAttributes$ = of([]);
      return;
    }

    const parentEntityName$ = this.selectedNode.getParentEntityName(parentEntityNode)
      .pipe(distinctUntilChanged());

    const validatedAttributes$ = parentEntityName$.pipe(
      switchMap(entityName => {
        if (!entityName || entityName.trim() === '') {
          console.warn('[AttributeFormComponent] Empty parent entity name');
          return of([]);
        }
        
        this.loading = true;
        console.debug(`[AttributeFormComponent] Fetching attributes for entity: ${entityName}`);
        
        // Pass the entity node to check validation state
        return this.attributeService.getAttributes(entityName, parentEntityNode).pipe(
          map(attributes => {
            this.loading = false;
            console.debug(`[AttributeFormComponent] Received ${attributes.length} attributes for entity: ${entityName}`);
            return attributes;
          }),
          catchError(error => {
            this.loading = false;
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