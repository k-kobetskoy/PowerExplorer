import { Injectable } from '@angular/core';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { distinctUntilChanged, map, NEVER, Observable, shareReplay, switchMap, takeUntil } from 'rxjs';
import { ValidationResult } from '../../validation.service';
import { NodeAttribute } from '../../../models/node-attribute';
import { EntityEntityService } from '../../entity-services/entity-entity.service';

const VALID_RESULT: Readonly<ValidationResult> = {
  isValid: true,
  errors: [] as string[]
};

@Injectable({ providedIn: 'root' })

export class EntityNameServerValidatorService implements IAttributeValidator {

  constructor(private entityService: EntityEntityService) { }

  getValidator(attribute: NodeAttribute): Observable<ValidationResult> {

    return this.entityService.getEntities().pipe(
      switchMap(entities => {
        return attribute.value$.pipe(
          distinctUntilChanged(),
          map((value) => {
            if (!value) return VALID_RESULT;

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
      takeUntil(attribute?.destroyNotifier$ || NEVER),
    );
  }
}
