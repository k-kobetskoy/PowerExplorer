import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, SimpleChanges, Input } from '@angular/core';
import { BaseFormComponent } from '../base-form.component';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, Observable, shareReplay, startWith, filter } from 'rxjs';
import { QueryNode } from '../../../models/query-node';
import { AttributeData } from '../../../models/constants/attribute-data';

@Component({
    selector: 'app-root-form',
    templateUrl: './root-form.component.html',
    styleUrls: ['./root-form.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RootFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
    private destroy$ = new Subject<void>();

    constructor() { super(); }

    @Input() selectedNode: QueryNode;

    topFormControl = new FormControl('');
    distinctFormControl = new FormControl(false);
    aggregateFormControl = new FormControl(false);
    totalRecordsCountFormControl = new FormControl(false);
    lateMaterializeFormControl = new FormControl(false);
    recordsPerPageFormControl = new FormControl('');
    pageFormControl = new FormControl('');
    pagingCookieFormControl = new FormControl('');
    dataSourceFormControl = new FormControl('');

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
        this.setInputInitialValues();

        // Form input -> Model
        this.setupFormToModelBindings();
    }

    private setInputInitialValues() {
        const topAttribute = this.getAttribute(AttributeData.Root.Top, this.selectedNode);
        const distinctAttribute = this.getAttribute(AttributeData.Root.Distinct, this.selectedNode);
        const aggregateAttribute = this.getAttribute(AttributeData.Root.Aggregate, this.selectedNode);
        const totalRecordsCountAttribute = this.getAttribute(AttributeData.Root.TotalRecordsCount, this.selectedNode);
        const lateMaterializeAttribute = this.getAttribute(AttributeData.Root.LateMaterialize, this.selectedNode);
        const recordsPerPageAttribute = this.getAttribute(AttributeData.Root.RecordsPerPage, this.selectedNode);
        const pageAttribute = this.getAttribute(AttributeData.Root.Page, this.selectedNode);
        const pagingCookieAttribute = this.getAttribute(AttributeData.Root.PagingCookie, this.selectedNode);
        const dataSourceAttribute = this.getAttribute(AttributeData.Root.DataSource, this.selectedNode);

        if (topAttribute) {
            this.topFormControl.setValue(topAttribute.value$.value, { emitEvent: false });
        }

        if (distinctAttribute) {
            this.distinctFormControl.setValue(distinctAttribute.value$.value === 'true', { emitEvent: false });
        }

        if (aggregateAttribute) {
            this.aggregateFormControl.setValue(aggregateAttribute.value$.value === 'true', { emitEvent: false });
        }

        if (totalRecordsCountAttribute) {
            this.totalRecordsCountFormControl.setValue(totalRecordsCountAttribute.value$.value === 'true', { emitEvent: false });
        }

        if (lateMaterializeAttribute) {
            this.lateMaterializeFormControl.setValue(lateMaterializeAttribute.value$.value === 'true', { emitEvent: false });
        }

        if (recordsPerPageAttribute) {
            this.recordsPerPageFormControl.setValue(recordsPerPageAttribute.value$.value, { emitEvent: false });
        }

        if (pageAttribute) {
            this.pageFormControl.setValue(pageAttribute.value$.value, { emitEvent: false });
        }

        if (pagingCookieAttribute) {
            this.pagingCookieFormControl.setValue(pagingCookieAttribute.value$.value, { emitEvent: false });
        }

        if (dataSourceAttribute) {
            this.dataSourceFormControl.setValue(dataSourceAttribute.value$.value, { emitEvent: false });
        }
    }

    private setupFormToModelBindings() {
        this.topFormControl.valueChanges.pipe(
            filter(() => this.topFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.Top, this.selectedNode, value);
        });

        this.distinctFormControl.valueChanges.pipe(
            filter(() => this.distinctFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.Distinct, this.selectedNode, value.toString());
        });

        this.aggregateFormControl.valueChanges.pipe(
            filter(() => this.aggregateFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.Aggregate, this.selectedNode, value.toString());
        });

        this.totalRecordsCountFormControl.valueChanges.pipe(
            filter(() => this.totalRecordsCountFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.TotalRecordsCount, this.selectedNode, value.toString());
        });

        this.lateMaterializeFormControl.valueChanges.pipe(
            filter(() => this.lateMaterializeFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.LateMaterialize, this.selectedNode, value.toString());
        });

        this.recordsPerPageFormControl.valueChanges.pipe(
            filter(() => this.recordsPerPageFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.RecordsPerPage, this.selectedNode, value);
        });

        this.pageFormControl.valueChanges.pipe(
            filter(() => this.pageFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.Page, this.selectedNode, value);
        });

        this.pagingCookieFormControl.valueChanges.pipe(
            filter(() => this.pagingCookieFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.PagingCookie, this.selectedNode, value);
        });

        this.dataSourceFormControl.valueChanges.pipe(
            filter(() => this.dataSourceFormControl.dirty),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            this.updateAttribute(AttributeData.Root.DataSource, this.selectedNode, value);
        });
    }


    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
