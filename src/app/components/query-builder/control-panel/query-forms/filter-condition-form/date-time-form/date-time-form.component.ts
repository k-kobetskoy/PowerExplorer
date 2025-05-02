import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from 'src/app/components/query-builder/services/multi-value-nodes.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MultiValueFormComponent } from '../multi-value-form/multi-value-form.component';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
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
  selector: 'app-date-time-form',
  templateUrl: './date-time-form.component.html',
  styleUrls: ['./date-time-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateTimeFormComponent extends OperatorValueBaseFormComponent {
  readonly filterOperators = FilterStaticData.FilterDateTimeOperators;

  constructor(multiValueNodesSvc: MultiValueNodesService) { 
    super(multiValueNodesSvc); 
  }
}
