import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-root-form',
    templateUrl: './root-form.component.html',
    styleUrls: ['./root-form.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RootFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
    rootForm: FormGroup;
    private destroy$ = new Subject<void>();
    
    constructor(private fb: FormBuilder) {
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
        this.rootForm = this.fb.group({
            top: [this.getAttributeValue(this.AttributeData.Root.Top)],
            distinct: [this.getAttributeValue(this.AttributeData.Root.Distinct) === 'true'],
            aggregate: [this.getAttributeValue(this.AttributeData.Root.Aggregate) === 'true'],
            returntotalrecordcount: [this.getAttributeValue(this.AttributeData.Root.TotalRecordsCount) === 'true'],
            latematerialize: [this.getAttributeValue(this.AttributeData.Root.LateMaterialize) === 'true'],
            count: [this.getAttributeValue(this.AttributeData.Root.RecordsPerPage)],
            page: [this.getAttributeValue(this.AttributeData.Root.Page)],
            'paging-cookie': [this.getAttributeValue(this.AttributeData.Root.PagingCookie)],
            datasource: [this.getAttributeValue(this.AttributeData.Root.DataSource)]
        });
        
        // Subscribe to form value changes
        this.rootForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(formValues => {
                // Only update attributes that have changed
                Object.entries(formValues).forEach(([key, value]) => {
                    // Convert boolean values to string
                    const stringValue = value !== null && value !== undefined 
                        ? (typeof value === 'boolean' ? value.toString() : String(value))
                        : '';
                    
                    // Find the corresponding attribute
                    const attribute = Object.values(this.AttributeData.Root)
                        .find(attr => attr.EditorName === key);
                    
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
    
    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
