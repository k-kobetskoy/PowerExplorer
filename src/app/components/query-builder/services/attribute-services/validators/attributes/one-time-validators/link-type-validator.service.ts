import { Injectable } from '@angular/core';
import { NodeAttribute } from 'src/app/components/query-builder/models/node-attribute';
import { VALID_RESULT } from '../../../../validation.service';
import { ValidationResult } from '../../../../validation.service';
import { LinkTypeOptions } from 'src/app/components/query-builder/models/constants/ui/link-type-options';
import { IAttributeOneTimeValidator } from '../../../abstract/i-attribute-one-time-validator';
@Injectable({
  providedIn: 'root'
})
export class LinkTypeValidatorService implements IAttributeOneTimeValidator {

  constructor() { }

  validate(attribute: NodeAttribute): ValidationResult {
     const value = attribute.value$.value;

     if (value === undefined || value === null || value.trim() === '') { return VALID_RESULT; }

     const isValid = LinkTypeOptions.includes(value);

     return {
      isValid,
      errors: isValid ? [] : [`Invalid link type.`]
     }
  }
}
