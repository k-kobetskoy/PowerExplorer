import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { StatusEntityService } from 'src/app/components/query-builder/services/entity-services/status-entity.service';
import { MultiValueNodesService } from 'src/app/components/query-builder/services/multi-value-nodes.service';
import { FilterStaticData } from 'src/app/components/query-builder/models/constants/ui/filter-static-data';
import { StateModel } from 'src/app/models/incoming/status/state-response-model';
import { Observable, of, switchMap, takeUntil } from 'rxjs';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';

@Component({
  selector: 'app-status-form',
  templateUrl: './status-form.component.html',
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
export class StatusFormComponent extends OperatorValueBaseFormComponent {

  readonly filterOperators = FilterStaticData.FilterPickListOperators;
  statusOptions$: Observable<StateModel[]>;

  constructor(
    private statusService: StatusEntityService, 
    multiValueNodesSvc: MultiValueNodesService) {
    super(multiValueNodesSvc);
  }
  protected override initializeForm() {
    super.initializeForm();
    this.setupStatusOptions();
  }

  private setupStatusOptions() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      this.statusOptions$ = of([]);
      return;
    }

    this.statusOptions$ = parentEntityNode.validationResult$.pipe(
      switchMap(validationResult => {
        if (!validationResult.isValid) {
          return of([]);
        }

        return parentEntityNode.attributes$.pipe(
          switchMap(attributes => {
            const entityAttribute = attributes.find(attr => attr.editorName === AttributeNames.entityName);
            if (!entityAttribute) {
              return of([]);
            }
            return entityAttribute.value$.pipe(
              switchMap(entityName => {
                return this.statusService.getStateOrStatusCodeValues(entityName, this.attributeValue);
              })
            );
          })
        );
      }),
      takeUntil(this.destroy$)
    );
  }
}
