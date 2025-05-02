import { Injectable } from '@angular/core';
import { IAttributeValidator } from '../../abstract/i-attribute-validator';
import { ValidationResult } from '../../../validation.service';
import { distinctUntilChanged, map, Observable } from 'rxjs';
import { NodeAttribute } from '../../../../models/node-attribute';

@Injectable({ providedIn: 'root' })

/**
 *  Validates that the alias value is valid.
 */

export class AttributeAliasValueValidatorService implements IAttributeValidator {

  constructor() { }

  validate(attribute: NodeAttribute): Observable<ValidationResult> {
    return attribute.value$.pipe(
      distinctUntilChanged(),
      map(value => {
        const isValid = this.isValidAlias(String(value || ''));
        return {
          isValid,
          errors: isValid ? [] : [`Incorrect value.`]
        };
      })
    );

  }
  private isValidAlias(value: string): boolean {
    if (!value) return true;
    return isNaN(Number(value.charAt(0))) && !/\s/.test(value);
  }
}
