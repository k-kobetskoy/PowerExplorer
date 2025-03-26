import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';
import { FilterStaticData } from '../../../../models/constants/ui/filter-static-data';
import { QueryNode } from '../../../../models/query-node';
import { PicklistEntityService } from '../../../../services/entity-services/picklist-entity.service';
import { PicklistModel } from 'src/app/models/incoming/picklist/picklist-model';
import { AttributeType } from '../../../../models/constants/dataverse/attribute-types';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
import { OperatorValueBaseFormComponent } from '../../operator-value-base-form.component';
import { MultiValueNodesService } from 'src/app/components/query-builder/services/multi-value-nodes.service';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { QuickActionsComponent } from '../../quick-actions/quick-actions.component';
import { LoadingIndicatorComponent } from 'src/app/components/loading-indicator/loading-indicator.component';
import { MultiValueFormComponent } from '../multi-value-form/multi-value-form.component'; 

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    LoadingIndicatorComponent,
    MultiValueFormComponent
  ],  
  selector: 'app-picklist-form',
  templateUrl: './picklist-form.component.html',
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

    .option-label {
      font-weight: 500;
    }

    .option-value {
      font-size: 0.85em;
      color: rgba(0, 0, 0, 0.6);
    }

    .error-message {
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PicklistFormComponent extends OperatorValueBaseFormComponent {
  readonly filterOperators = FilterStaticData.FilterPickListOperators;
  picklistOptions$: Observable<PicklistModel[]>;

  constructor(
    private picklistService: PicklistEntityService, 
    multiValueNodesSvc: MultiValueNodesService) 
    { super(multiValueNodesSvc); }

  protected override initializeForm() {
    super.initializeForm();
    this.setupPicklistOptions();
  }

  private setupPicklistOptions() {
    const parentEntityNode = this.selectedNode.getParentEntity();

    if (!parentEntityNode) {
      this.picklistOptions$ = of([]);
      return;
    }

    this.picklistOptions$ = parentEntityNode.validationResult$.pipe(
      switchMap(validationResult => {
        
        if (validationResult.isValid) {
          return parentEntityNode.attributes$.pipe(
            switchMap(attributes => {
              const entityAttribute = attributes.find(attr => attr.editorName === AttributeNames.entityName);
              if (entityAttribute) {                
                return entityAttribute.value$.pipe(
                  distinctUntilChanged(),
                  switchMap(entityName => {
                    return this.picklistService.getOptions(entityName, this.attributeValue, AttributeType.PICKLIST);
                  })
                );
              }
              return of([]);
            })
          );
        }
        return of([]);
      }),
      takeUntil(this.destroy$)      
    );
  }
}
