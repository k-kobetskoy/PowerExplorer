import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from '../../../../services/multi-value-nodes.service';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
@Component({
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatOptionModule,
        MatAutocompleteModule,
        MatIconModule,
        MatButtonModule,
        FormsModule
    ],      
    selector: 'app-multi-value-form',
    templateUrl: './multi-value-form.component.html',
    styleUrls: ['./multi-value-form.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiValueFormComponent extends OperatorValueBaseFormComponent implements OnInit, OnDestroy {
    override multiValueControl = new FormControl('');
    operatorType$ = new BehaviorSubject<string>('');

    @Input() hideOperator = false;
    
    filterOperators = FilterStaticData.FilterStringOperators;

    constructor(private multiValueNodesSvc: MultiValueNodesService) {
        super(multiValueNodesSvc);
    }

    override ngOnInit() {
        super.ngOnInit();
        this.setupMultiValueInput();
    }

    protected override initializeForm() {
        super.initializeForm();

        this.loadExistingMultiValues();
    }

    private setupMultiValueInput() {
        this.operatorFormControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => {
                if (value) {
                    this.operatorType$.next(value);

                    if (this.isMultiValueOperator(value)) {
                        this.multiValueControl.setValue('', { emitEvent: false });
                        this.handleMultiValueOperator();
                    }
                }
            });
    }

    override onMultiValueBlur(): void {
        if (this.isMultiValueOperator(this.operatorFormControl.value)) {
            this.processMultiValues();
        }
    }

    override onMultiValueEnter(event: Event): void {
        event.preventDefault();
        if (this.isMultiValueOperator(this.operatorFormControl.value)) {
            this.processMultiValues();
        }
    }

    override processMultiValues(): void {
        this.multiValueNodesSvc.processMultiValues(this.selectedNode, this.multiValueControl.value);
        this.multiValueControl.setValue('', { emitEvent: false });
    }

    private loadExistingMultiValues() {
        // Only called during initial form setup
        if (this.isMultiValueOperator(this.operatorFormControl.value)) {
            this.multiValueControl.setValue('', { emitEvent: false });
        }
    }

    protected override handleMultiValueOperator() {
        super.handleMultiValueOperator();
    }

    protected override handleMultiValueInput(inputValue: string) {
        // No longer automatically process inputs - wait for blur/Enter
    }

    override ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
} 