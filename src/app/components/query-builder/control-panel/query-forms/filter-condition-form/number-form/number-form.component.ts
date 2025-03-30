import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from '../../../../services/multi-value-nodes.service';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MultiValueFormComponent } from '../multi-value-form/multi-value-form.component';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';

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
  selector: 'app-number-form',
  templateUrl: './number-form.component.html',
  styleUrls: ['./number-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NumberFormComponent extends OperatorValueBaseFormComponent {
  readonly filterOperators = FilterStaticData.FilterNumberOperators;

  constructor(multiValueNodesSvc: MultiValueNodesService) { 
    super(multiValueNodesSvc); 
  }
}
