import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from 'src/app/components/query-builder/services/multi-value-nodes.service';

@Component({
  selector: 'app-date-time-form',
  templateUrl: './date-time-form.component.html',
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateTimeFormComponent extends OperatorValueBaseFormComponent {
  readonly filterOperators = FilterStaticData.FilterDateTimeOperators;

  constructor(multiValueNodesSvc: MultiValueNodesService) { 
    super(multiValueNodesSvc); 
  }
}
