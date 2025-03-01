import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, combineLatest, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, finalize } from 'rxjs/operators';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { QueryNode } from '../../../models/query-node';

@Component({
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  orderForm: FormGroup;
  filteredAttributes$: Observable<AttributeModel[]>;

  @Input() override selectedNode: QueryNode;

  constructor(private attributeService: AttributeEntityService, private fb: FormBuilder) { super(); }

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
    this.orderForm = this.fb.group({
      attribute: [this.getAttributeValue(this.AttributeData.Order.Attribute)],
      descending: [this.getAttributeValue(this.AttributeData.Order.Desc) === 'true']
    });

    this.setupAttributeAutocomplete();

    this.orderForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(formValues => {
        Object.entries(formValues).forEach(([key, value]) => {
          const stringValue = value !== null && value !== undefined
            ? (typeof value === 'boolean' ? value.toString() : String(value))
            : '';

          let attribute;
          if (key === 'attribute') {
            attribute = this.AttributeData.Order.Attribute;
          } else if (key === 'descending') {
            attribute = this.AttributeData.Order.Desc;
          }

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

    this.filteredAttributes$ = combineLatest([
      this.orderForm.get('attribute').valueChanges.pipe(
        startWith(this.orderForm.get('attribute').value || '')
      ),
      parentEntityName$.pipe(
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
      )
    ]).pipe(
      debounceTime(300),
      map(([value, attributes]) => this.filterAttributes(value || '', attributes))
    );
  }

  private filterAttributes(value: string, attributes: AttributeModel[]): AttributeModel[] {
    const filterValue = value.toLowerCase();
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
