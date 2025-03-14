import { Injectable } from '@angular/core';
import { IAttributeValidator } from '../../abstract/i-attribute-validator';
import { distinctUntilChanged, map, NEVER, Observable, shareReplay, switchMap, takeUntil } from 'rxjs';
import { VALID_RESULT, ValidationResult } from '../../../validation.service';
import { NodeAttribute } from '../../../../models/node-attribute';
import { EntityEntityService } from '../../../entity-services/entity-entity.service';

@Injectable({ providedIn: 'root' })

export class EntityNameServerValidatorService implements IAttributeValidator {

  constructor(private entityService: EntityEntityService) { }

  validate(attribute: NodeAttribute): Observable<ValidationResult> {

    return this.entityService.getEntities().pipe(
      switchMap(entities => {
        return attribute.value$.pipe(
          distinctUntilChanged(),
          map((value) => {
            if (!value) return {
              isValid: false,
              errors: ['Entity name is required']
            };

            const entity = entities.find(e => e.logicalName === value);

            if (entity) {
              attribute.parentNode.entitySetName$.next(entity.entitySetName);
              return VALID_RESULT;
            }

            return {
              isValid: false,
              errors: [`Entity '${value}' not found.`]
            };
          })
        );
      }),
      takeUntil(attribute?.destroyed$ || NEVER),
      //We need shareReplay because this validation is also called to check if the attribute name is valid. !Not sure about that.
      shareReplay({
        refCount: true,
        bufferSize: 1,
        windowTime: 0
      })
    );
  }
}
