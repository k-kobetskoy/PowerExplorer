import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from '../../../../services/multi-value-nodes.service';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MultiValueFormComponent } from '../multi-value-form/multi-value-form.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatIconModule,
    MultiValueFormComponent,
    MatSelectModule,    
    MatButtonModule,
    FormsModule
  ],  
  selector: 'app-string-form',
  templateUrl: './string-form.component.html',
  styleUrls: ['./string-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StringFormComponent extends OperatorValueBaseFormComponent {
  showWildcardInfo$ = new BehaviorSubject<boolean>(false);
  readonly filterOperators = FilterStaticData.FilterStringOperators;

  constructor(multiValueNodesSvc: MultiValueNodesService) {
    super(multiValueNodesSvc);
  }

  protected override initializeForm() {
    super.initializeForm();
    this.setupWildcardInfo();
  }

  private setupWildcardInfo() {
    this.operatorFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.showWildcardInfo$.next(['like', 'not-like'].includes(value.toLowerCase()));
        }
      });
  }
}
