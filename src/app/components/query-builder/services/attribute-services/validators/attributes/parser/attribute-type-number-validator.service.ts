import { Injectable } from '@angular/core';
import { IAttributeValidator } from '../../../abstract/i-attribute-validator';
import { distinctUntilChanged, map, Observable } from 'rxjs';
import { NodeAttribute } from '../../../../../models/node-attribute';
import { ValidationResult } from '../../../../validation.service';

/**
 * check if attribute's value is a number (Parser Validation Only)
 *   
 * */ 

@Injectable({ providedIn: 'root' })
export class AttributeTypeNumberValidatorService implements IAttributeValidator {

  constructor() { }

  validate(attribute: NodeAttribute): Observable<ValidationResult> {
    return attribute.value$.pipe(
      distinctUntilChanged(),
      map(value => {
        const isValid = this.isNumber(String(value || ''));
        return {
          isValid,
          errors: isValid ? [] : [`The value must be a number.`]
        };
      })
    );
  }

  private isNumber(value: string): boolean {
    if (!value) return true;
    const trimmedValue = value.trim();
    return trimmedValue === '' || !isNaN(Number(trimmedValue));
  }
}
