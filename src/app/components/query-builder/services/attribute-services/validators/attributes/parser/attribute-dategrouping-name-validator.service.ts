import { Injectable } from '@angular/core';
import { NodeAttribute } from 'src/app/components/query-builder/models/node-attribute';
import { ValidationResult } from '../../../../validation.service';
import { AttributeData } from 'src/app/components/query-builder/models/constants/attribute-data';
import { IAttributeValidator } from '../../../abstract/i-attribute-validator';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
/**
 *  Validates that the date grouping name is valid. Attribute node.
 *  Validation applied on date grouping attribute of attribute node.
 *  Parser Validation Only
 */
export class AttributeDateGroupingNameValidatorService implements IAttributeValidator {

  constructor() { }

  validate(attribute: NodeAttribute): Observable<ValidationResult> {

    return attribute.value$.pipe(
      map(value => {
        const isValid = AttributeData.DateGroupingNames.includes(value.trim());
        return {
          isValid,
          errors: isValid ? [] : [`'${value}' is not a valid date grouping name`]
        };
      })
    )
  }
}
