import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { BooleanModel } from 'src/app/models/incoming/boolean/boolean-model';
import { BooleanEntityService } from '../../../../services/entity-services/boolean-entity.service';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from 'src/app/components/query-builder/services/multi-value-nodes.service';

@Component({
  selector: 'app-boolean-form',
  templateUrl: './boolean-form.component.html',
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
export class BooleanFormComponent extends OperatorValueBaseFormComponent {
  booleanOptions$: Observable<BooleanModel>;

  readonly filterOperators = FilterStaticData.FilterBooleanOperators;

  constructor(
    private booleanService: BooleanEntityService, multiValueNodesSvc: MultiValueNodesService) { 
      super(multiValueNodesSvc); 
    }

  protected override initializeForm() {
    super.initializeForm();
    this.setupBooleanOptions();
  }

  private setupBooleanOptions() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      this.booleanOptions$ = of(<BooleanModel>{});
      return;
    }

    this.booleanOptions$ = parentEntityNode.validationResult$.pipe(
      switchMap(validationResult => {
        if (validationResult.isValid) {
          return parentEntityNode.attributes$.pipe(
            switchMap(attributes => {              
              const entityAttribute = attributes.find(attr => attr.editorName === AttributeNames.entityName);
              if (entityAttribute) {
                return entityAttribute.value$.pipe(
                  distinctUntilChanged(),
                  switchMap(entityName => {
                    return this.booleanService.getBooleanValues(entityName, this.attributeValue);
                  })
                );
              }
              return of(<BooleanModel>{});
            })
          );
        }
        return of(<BooleanModel>{});
      }),
      takeUntil(this.destroy$)
    );
  }
}
