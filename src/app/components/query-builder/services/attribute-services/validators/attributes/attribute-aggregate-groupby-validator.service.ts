import { Injectable } from '@angular/core';
import { NodeAttribute } from 'src/app/components/query-builder/models/node-attribute';
import { VALID_RESULT, ValidationResult } from '../../../validation.service';
import { IAttributeValidator } from '../../abstract/i-attribute-validator';
import { map, Observable, distinctUntilChanged, switchMap, of, combineLatest, catchError } from 'rxjs';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
@Injectable({ providedIn: 'root' })

/**
 *  Validates that when group by is set on aggregate attribute of the attribute node, the aggregate attribute on the root node is set to true. Attribute node.
 *  Validation applied on group by attribute of attribute node.
 *  
 */

export class AttributeAggregateGroupByValidatorService implements IAttributeValidator {

  constructor() { }

  validate(attribute: NodeAttribute): Observable<ValidationResult> {
    const rootNode = attribute.parentNode.getRootNode();

    return rootNode.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      switchMap(attributes => {
        
        const fetchAggregateAttr = attributes.find(attr => attr.editorName === AttributeNames.rootAggregate);

        if (!fetchAggregateAttr) {
          return of({
            isValid: false,
            errors: ['Aggregate setting is not found']
          });
        }

        return combineLatest([
          fetchAggregateAttr.value$.pipe(distinctUntilChanged()),
          attribute.value$.pipe(distinctUntilChanged())
        ]).pipe(
          map(([isAggregate, isGroupBy]) => {
            // Only validate when aggregate is enabled
            if (isAggregate !== 'true') {
              return VALID_RESULT;
            }

            // Check if function name is provided
            if (!isGroupBy || isGroupBy.trim() === '') {
              return {
                isValid: false,
                errors: ['Value is required']
              };
            }

            return VALID_RESULT;
          })
        );
      }),
      catchError(error => {
        console.error('Error in aggregate function name validation:', error);
        return of({
          isValid: false,
          errors: ['Error validating aggregate function name']
        });
      })
    );
  }
}
