import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { distinctUntilChanged } from 'rxjs';
import { QueryNode } from 'src/app/components/query-builder/models/query-node';
import { ValidationResult } from '../../../validation.service';
import { INodeValidator } from '../../abstract/i-node-validator';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';

@Injectable({ providedIn: 'root' })

/**
 *  Validates that the Entity node has a 'name' attribute.
 */

export class EntityNodeRequiredNameValidatorService implements INodeValidator {

  constructor() { }

  validate(node: QueryNode): Observable<ValidationResult> {
    return node.attributes$.pipe(
      map(attributes => {

        const nameAttribute = attributes.find(attr => attr.editorName === AttributeNames.entityName);

        return {
          isValid: !!nameAttribute,
          errors: nameAttribute ? [] : [`Entity name is required.`]
        };
      }), 
      tap(result=> console.log(result))
    );
  }
}
