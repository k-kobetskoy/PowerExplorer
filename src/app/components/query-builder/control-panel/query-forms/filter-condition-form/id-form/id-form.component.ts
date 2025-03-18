import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';

@Component({
  selector: 'app-id-form',
  templateUrl: './id-form.component.html',
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
export class IdFormComponent extends OperatorValueBaseFormComponent {
  readonly filterOperators = FilterStaticData.FilterIdOperators;

  constructor() { super(); }
}
