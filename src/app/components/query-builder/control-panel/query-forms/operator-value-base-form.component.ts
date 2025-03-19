import { Input, OnChanges, OnDestroy, OnInit, SimpleChanges, Component, AfterViewInit, ChangeDetectionStrategy, OnDestroy as ngOnDestroy, DoCheck } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
import { AttributeData } from '../../models/constants/attribute-data';
import { QueryNode } from '../../models/query-node';
import { BaseFormComponent } from './base-form.component';
import { MultiValueNodesService } from '../../services/multi-value-nodes.service';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
export class OperatorValueBaseFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
    protected destroy$ = new Subject<void>();
    private previousAttributeValue: string;

    operatorFormControl = new FormControl('');
    valueFormControl = new FormControl('');

    @Input() attributeValue: string;
    @Input() selectedNode: QueryNode;

    // List of operators that require multi-value handling
    protected multiValueOperators = ['in', 'not-in', 'between', 'not-between'];

    constructor(protected multiValueNodesService?: MultiValueNodesService) {
        super();
    }

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
                    // First clear any existing value nodes to ensure clean state
                    if (this.multiValueNodesService) {
                        console.log('Operator changed, clearing any existing value nodes');
                        this.multiValueNodesService.clearValueNodes(this.selectedNode);
                    }
                    
                    // Update the operator attribute
                    this.updateAttribute(AttributeData.Condition.Operator, this.selectedNode, value);
                    
                    // Handle multi-value operators
                    if (this.isMultiValueOperator(value)) {
                        this.handleMultiValueOperator();
                    } else {
                        // For single-value operators, ensure we have a value attribute
                        this.ensureValueAttribute();
                    }
                }
            });

        this.valueFormControl.valueChanges
            .pipe(
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(value => {
                if (value !== undefined) {
                    const currentOperator = this.operatorFormControl.value;
                    
                    if (this.isMultiValueOperator(currentOperator)) {
                        this.handleMultiValueInput(value);
                    } else {
                        this.updateAttribute(AttributeData.Condition.Value, this.selectedNode, value);
                    }
                }
            });
    }

    // Check if the operator is a multi-value operator
    protected isMultiValueOperator(operatorValue: string): boolean {
        return this.multiValueOperators.includes(operatorValue?.toLowerCase());
    }

    // Handle changing to a multi-value operator
    protected handleMultiValueOperator() {
        // Remove single value attribute when switching to multi-value operator
        this.selectedNode.removeAttribute(AttributeNames.conditionValue);
    }

    // Ensure value attribute exists for single-value operators
    protected ensureValueAttribute() {
        // First, clear any value nodes from previous multi-value operator
        if (this.multiValueNodesService) {
            this.multiValueNodesService.clearValueNodes(this.selectedNode);
        }
        
        // Then ensure value attribute exists
        const value = this.getAttribute(AttributeData.Condition.Value, this.selectedNode);
        if (!value) {
            this.updateAttribute(AttributeData.Condition.Value, this.selectedNode, '');
        }
    }

    // Handle multi-value input processing
    protected handleMultiValueInput(inputValue: string) {
        // Default implementation - to be overridden by child classes
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
} 