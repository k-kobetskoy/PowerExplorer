import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, combineLatest, of } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { BaseFormComponent } from '../base-form.component';

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
      name: [this.getAttributeValue(this.AttributeData.Attribute.Name)],
      alias: [this.getAttributeValue(this.AttributeData.Attribute.Alias)]
    });

    this.setupAttributeAutocomplete();

    this.attributeForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(formValues => {
        Object.entries(formValues).forEach(([key, value]) => {
          const stringValue = value !== null && value !== undefined ? String(value) : '';

          const attribute = Object.values(this.AttributeData.Attribute)
            .find(attr => attr.EditorName === key);

          if (attribute) {
            const currentValue = this.getAttributeValue(attribute);
            if (currentValue !== stringValue) {
              this.updateAttribute(attribute, stringValue);
            }
          }
        });
      });
  }

  private setupAttributeAutocomplete() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      console.warn('Parent entity node not found');
      this.filteredAttributes$ = of([]);
      return;
    }

    const parentEntityName$ = this.selectedNode.getParentEntityName(parentEntityNode)
      .pipe(distinctUntilChanged());

    const validatedAttributes$ = parentEntityName$.pipe(
      switchMap(entityName => {
        if (!entityName || entityName.trim() === '') {
          console.warn('Empty parent entity name');
          return of([]);
        }

        return parentEntityNode.validationPassed$.pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.warn(`Parent entity '${entityName}' validation failed`);
              return of([]);
            }
            
            return this.attributeService.getAttributes(entityName);
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
      debounceTime(300),
      map(([value, attributes]) => this.filterAttributes(value, attributes))
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