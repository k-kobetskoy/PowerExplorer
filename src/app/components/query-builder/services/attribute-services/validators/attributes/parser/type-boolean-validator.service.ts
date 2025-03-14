import { Injectable } from '@angular/core';
import { IAttributeValidator } from '../../../abstract/i-attribute-validator';
import { distinctUntilChanged, map, Observable } from 'rxjs';
import { NodeAttribute } from '../../../../../models/node-attribute';
import { ValidationResult } from '../../../../validation.service';

@Injectable({ providedIn: 'root' })

/**
 * check if attribute's value is a boolean (Parser Validation Only)
 *   
 * */ 

export class TypeBooleanValidatorService implements IAttributeValidator {

  constructor() { }

  validate(attribute: NodeAttribute): Observable<ValidationResult> {
    return attribute.value$.pipe(
      distinctUntilChanged(),
      map(value => {
        const isValid = this.isBoolean(String(value || ''));
        return {
          isValid,
          errors: isValid ? [] : [`The value must be a boolean.`]
        };
      })
    );
  }

  private isBoolean(value: string): boolean {
    if (!value) return true;
    const trimmedValue = value.trim().toLowerCase();
    return trimmedValue === '' || trimmedValue === 'true' || trimmedValue === 'false';
  }
}
