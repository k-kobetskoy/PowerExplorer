import { Injectable } from '@angular/core';
import { Observable, distinctUntilChanged, switchMap, of, combineLatest, map, catchError } from 'rxjs';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
import { NodeAttribute } from 'src/app/components/query-builder/models/node-attribute';
import { ValidationResult, VALID_RESULT } from '../../../validation.service';

@Injectable({
  providedIn: 'root'
})
export class AttributeAggregateConditionFetchAggregateValidatorService {

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
          map(([isAggregate, functionName]) => {
            // Only validate when aggregate is enabled
            if (isAggregate !== 'true') {
              return VALID_RESULT;
            }

            // Check if function name is provided
            if (!functionName || functionName.trim() === '') {
              return {
                isValid: false,
                errors: ['Aggregate function name is required']
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
