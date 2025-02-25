import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, combineLatest } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../services/entity-services/attribute-entity.service';
import { IFormPropertyModel } from '../../../models/abstract/i-form-property-model';
import { QueryNode } from '../../../models/query-node';
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
  `]
})
export class AttributeFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private storedValues = new Map<string, { attribute: string, alias: string }>();
  
  attributeFormControl = new FormControl('');
  aliasFormControl = new FormControl('');
  filteredAttributes$: Observable<AttributeModel[]>;
  loading$ = new BehaviorSubject<boolean>(false);

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
      
      // Clear stored values for the previous node
      this.storedValues.clear();
      
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
      this.aliasFormControl.setValue(values.alias, { emitEvent: false });
    } else {
      const attributeName = this.getAttributeValue(this.AttributeData.Attribute.Name);
      const aliasName = this.getAttributeValue(this.AttributeData.Attribute.Alias);
      if (attributeName) {
        this.attributeFormControl.setValue(attributeName, { emitEvent: false });
      }
      if (aliasName) {
        this.aliasFormControl.setValue(aliasName, { emitEvent: false });
      }
      this.storedValues.set(nodeId, { 
        attribute: attributeName || '', 
        alias: aliasName || '' 
      });
    }

    // Subscribe to form control changes
    this.attributeFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.storedValues.set(this.selectedNode.id, {
          ...this.storedValues.get(this.selectedNode.id),
          attribute: value
        });
        this.updateAttribute(this.AttributeData.Attribute.Name, value);
      });

    this.aliasFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.storedValues.set(this.selectedNode.id, {
          ...this.storedValues.get(this.selectedNode.id),
          alias: value
        });
        this.updateAttribute(this.AttributeData.Attribute.Alias, value);
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