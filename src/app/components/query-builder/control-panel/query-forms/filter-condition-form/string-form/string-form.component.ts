import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from '../../../../services/multi-value-nodes.service';

@Component({
  selector: 'app-string-form',
  templateUrl: './string-form.component.html',
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

    .hint-text {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 4px;
    }

    .wildcard-info, .hint-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .wildcard-info mat-icon, .hint-info mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `],
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
