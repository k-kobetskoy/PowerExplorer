import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, combineLatest, of, catchError, filter } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { BaseFormComponent } from '../base-form.component';
import { AttributeData } from '../../../models/constants/attribute-data';
import { QueryNode } from '../../../models/query-node';

@Component({
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

  public nameInputName = 'name';
  public aliasInputName = 'alias';

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
      { editorName: this.nameAttributeData.EditorName, control: this.nameInputName },
      { editorName: this.aliasAttributeData.EditorName, control: this.aliasInputName }
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

  // Helper method to get form control
  getFormControl(name: string): FormControl {
    return this.attributeForm.get(name) as FormControl;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}