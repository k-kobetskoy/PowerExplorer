import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
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
  loading$ = new BehaviorSubject<boolean>(false);

  @Input() override selectedNode: QueryNode;

  constructor(
    private attributeService: AttributeEntityService,
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
    this.orderForm = this.fb.group({
      attribute: [this.getAttributeValue(this.AttributeData.Order.Attribute)],
      descending: [this.getAttributeValue(this.AttributeData.Order.Desc) === 'true']
    });
    
    // Setup attribute autocomplete
    this.setupAttributeAutocomplete();
    
    // Subscribe to form value changes
    this.orderForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(formValues => {
        // Process each form control value
        Object.entries(formValues).forEach(([key, value]) => {
          // Convert boolean values to string
          const stringValue = value !== null && value !== undefined 
            ? (typeof value === 'boolean' ? value.toString() : String(value))
            : '';
          
          // Find the corresponding attribute
          let attribute;
          if (key === 'attribute') {
            attribute = this.AttributeData.Order.Attribute;
          } else if (key === 'descending') {
            attribute = this.AttributeData.Order.Desc;
          }
          
          if (attribute) {
            // Only update if the value has changed
            const currentValue = this.getAttributeValue(attribute);
            if (currentValue !== stringValue) {
              this.updateAttribute(attribute, stringValue);
            }
          }
        });
      });
  }

  private setupAttributeAutocomplete() {
    const parentEntityName$ = this.selectedNode.getParentEntityName()
      .pipe(distinctUntilChanged());

    this.filteredAttributes$ = combineLatest([
      this.orderForm.get('attribute').valueChanges.pipe(
        startWith(this.orderForm.get('attribute').value || '')
      ),
      parentEntityName$.pipe(
        switchMap(entityName => this.attributeService.getAttributes(entityName))
      )
    ]).pipe(
      debounceTime(300),
      distinctUntilChanged(),
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
