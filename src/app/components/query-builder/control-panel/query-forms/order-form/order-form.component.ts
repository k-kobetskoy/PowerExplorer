import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormControl } from '@angular/forms';
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
  `]
})
export class OrderFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { attribute: string, isDescending: boolean }>();

  attributeFormControl = new FormControl('');
  isDescendingControl = new FormControl(false);
  filteredAttributes$: Observable<AttributeModel[]>;
  loading$ = new BehaviorSubject<boolean>(false);

  @Input() override selectedNode: QueryNode;

  constructor(private attributeService: AttributeEntityService) {
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
    this.setupAttributeAutocomplete();
    this.setupNodeValueHandling();
  }

  private setupNodeValueHandling() {
    // When node changes, load its stored value or attribute value
    const nodeId = this.selectedNode.id;
    if (this.storedValues.has(nodeId)) {
      const values = this.storedValues.get(nodeId);
      this.attributeFormControl.setValue(values.attribute, { emitEvent: false });
      this.isDescendingControl.setValue(values.isDescending, { emitEvent: false });
    } else {
      const attributeName = this.getAttributeValue(this.AttributeData.Order.Attribute);
      const isDescending = this.getAttributeValue(this.AttributeData.Order.Desc) === 'true';
      
      if (attributeName) {
        this.attributeFormControl.setValue(attributeName, { emitEvent: false });
      }
      this.isDescendingControl.setValue(isDescending, { emitEvent: false });
      
      this.storedValues.set(nodeId, { 
        attribute: attributeName || '', 
        isDescending: isDescending 
      });
    }

    // Subscribe to form control changes
    this.attributeFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.storedValues.set(this.selectedNode.id, {
            ...this.storedValues.get(this.selectedNode.id),
            attribute: value
          });
          this.updateAttribute(this.AttributeData.Order.Attribute, value);
        }
      });

    this.isDescendingControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.storedValues.set(this.selectedNode.id, {
          ...this.storedValues.get(this.selectedNode.id),
          isDescending: value
        });
        this.updateAttribute(this.AttributeData.Order.Desc, value.toString());
      });
  }

  private setupAttributeAutocomplete() {
    const parentEntityName$ = this.selectedNode.getParentEntityName()
      .pipe(distinctUntilChanged());

    this.filteredAttributes$ = combineLatest([
      this.attributeFormControl.valueChanges.pipe(startWith('')),
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
