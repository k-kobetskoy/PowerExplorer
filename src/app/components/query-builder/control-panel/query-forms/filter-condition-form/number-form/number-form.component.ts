import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';

@Component({
  selector: 'app-number-form',
  templateUrl: './number-form.component.html',
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

    .error-message {
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NumberFormComponent extends OperatorValueBaseFormComponent {
  readonly filterOperators = FilterStaticData.FilterNumberOperators;

  constructor() { super(); }
}
