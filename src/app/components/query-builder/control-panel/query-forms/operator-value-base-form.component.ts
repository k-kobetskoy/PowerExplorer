import { Input, OnChanges, OnDestroy, OnInit, SimpleChanges, Component, AfterViewInit, ChangeDetectionStrategy, OnDestroy as ngOnDestroy, DoCheck } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
import { AttributeData } from '../../models/constants/attribute-data';
import { QueryNode } from '../../models/query-node';
import { BaseFormComponent } from './base-form.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
export class OperatorValueBaseFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
    protected destroy$ = new Subject<void>();
    private previousAttributeValue: string;

    operatorFormControl = new FormControl('');
    valueFormControl = new FormControl('');

    @Input() attributeValue: string;
    @Input() selectedNode: QueryNode;

    ngOnInit() {
        this.initializeForm();
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.applyCurrentValues();
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['attributeValue'] && this.attributeValue !== this.previousAttributeValue) {
            this.previousAttributeValue = this.attributeValue;
            this.destroy$.next();
            this.initializeForm();
        }
        else if (changes['selectedNode'] && this.selectedNode) {
            this.destroy$.next();
            this.initializeForm();
        }
    }

    protected initializeForm() {
        if (!this.selectedNode) return;

        this.applyCurrentValues();

        this.setupModelToFormBindings();
        this.setupFormToModelBindings();
    }

    private applyCurrentValues() {
        const operator = this.getAttribute(AttributeData.Condition.Operator, this.selectedNode);
        const value = this.getAttribute(AttributeData.Condition.Value, this.selectedNode);

        if (!operator) {
            this.operatorFormControl.setValue(null, { emitEvent: false });
        }
        else if (operator.value$.value && operator.value$.value !== this.operatorFormControl.value) {
            this.operatorFormControl.setValue(operator.value$.value, { emitEvent: false });
        }

        if (!value) {
            this.valueFormControl.setValue(null, { emitEvent: false });
        }
        else if (value.value$.value && value.value$.value !== this.valueFormControl.value) {
            this.valueFormControl.setValue(value.value$.value, { emitEvent: false });
        }
    }

    protected setupModelToFormBindings() {
        this.selectedNode.attributes$
            .pipe(
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(attributes => {
                const operator = attributes.find(attr => attr.editorName === AttributeNames.conditionOperator);
                const value = attributes.find(attr => attr.editorName === AttributeNames.conditionValue);

                if (!operator) {
                    if (this.operatorFormControl.value) {
                        this.operatorFormControl.setValue(null, { emitEvent: false });
                    }
                } else if (operator.value$.value !== this.operatorFormControl.value) {
                    this.operatorFormControl.setValue(operator.value$.value, { emitEvent: false });
                }

                if (!value) {
                    if (this.valueFormControl.value) {
                        this.valueFormControl.setValue(null, { emitEvent: false });
                    }
                } else if (value.value$.value !== this.valueFormControl.value) {
                    this.valueFormControl.setValue(value.value$.value, { emitEvent: false });
                }
            });
    }

    protected setupFormToModelBindings() {
        this.operatorFormControl.valueChanges
            .pipe(
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(value => {
                if (value !== undefined) {
                    this.updateAttribute(AttributeData.Condition.Operator, this.selectedNode, value);
                }
            });

        this.valueFormControl.valueChanges
            .pipe(
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(value => {
                if (value !== undefined) {
                    this.updateAttribute(AttributeData.Condition.Value, this.selectedNode, value);
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
} 