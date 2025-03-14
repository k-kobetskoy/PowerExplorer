import { Injectable } from '@angular/core';
import { distinctUntilChanged, map, Observable, Subject, NEVER, takeUntil } from 'rxjs';
import { VALID_RESULT, ValidationResult } from '../../../validation.service';
import { QueryNode } from 'src/app/components/query-builder/models/query-node';
import { INodeValidator } from '../../abstract/i-node-validator';

@Injectable({ providedIn: 'root' })

/**
 *  Validates that the Attribute node has a 'name' attribute.
 */

export class AttributeNodeRequiredNameValidatorService implements INodeValidator {

  constructor() { }

  validate(node: QueryNode, destroyed$?: Subject<void>): Observable<ValidationResult> {

    return node.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      map(attributes => {
        
        const nameAttribute = attributes.find(attr => attr.editorName === 'name');
        if(nameAttribute) {
          return VALID_RESULT;
        }

        return {
          isValid: false,
          errors: [`Attribute 'name' is required.`]
        } as ValidationResult;
      }),
      takeUntil(destroyed$ || NEVER)
    );
  }
}