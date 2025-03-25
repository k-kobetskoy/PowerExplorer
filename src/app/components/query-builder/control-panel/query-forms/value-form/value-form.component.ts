import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AttributeData } from '../../../models/constants/attribute-data';
import { QueryNode } from '../../../models/query-node';
import { BaseFormComponent } from '../base-form.component';

// Taiga UI imports
import { TUI_ICON_RESOLVER } from '@taiga-ui/core';
import { iconResolver } from 'src/app/app.module';

@Component({
  standalone: true,
  selector: 'app-value-form',
  templateUrl: './value-form.component.html',
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .form-field {
      width: 100%;
    }

    .hint-text {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 4px;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: TUI_ICON_RESOLVER,
      useFactory: iconResolver
    }
  ]
})
export class ValueFormComponent extends BaseFormComponent implements OnInit, OnDestroy, OnChanges {
  protected destroy$ = new Subject<void>();
  private previousAttributeValue: string;

  valueFormControl = new FormControl('');

  @Input() attributeValue: string;
  @Input() selectedNode: QueryNode;

  ngOnInit() {
    this.initializeForm();
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
    const value = this.getAttribute(AttributeData.Value.InnerText, this.selectedNode);

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
        const value = attributes.find(attr => attr.editorName === AttributeData.Value.InnerText.EditorName);

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
    this.valueFormControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (value !== undefined) {
          console.log('ValueForm: Updating attribute value to:', value);
          this.updateAttribute(AttributeData.Value.InnerText, this.selectedNode, value);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 