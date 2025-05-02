import { Injectable } from '@angular/core';
import { Observable, distinctUntilChanged, switchMap, map, of } from 'rxjs';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
import { QueryNode } from 'src/app/components/query-builder/models/query-node';
import { ValidationResult, VALID_RESULT } from '../../../validation.service';
import { INodeValidator } from '../../abstract/i-node-validator';

/**
 *  Validates that the Attribute node has an alias attribute when using aggregation in the fetch node.
 */

@Injectable({  providedIn: 'root' })
export class AttributeNodeAggregateRequiredAliasValidatorService implements INodeValidator {

  constructor() { }

  validate(node: QueryNode): Observable<ValidationResult> {
    const rootNode = node.getRootNode();

    return rootNode.attributes$.pipe(
      switchMap(attributes => {
        const aggregateAttr = attributes.find(attr => attr.editorName === AttributeNames.attributeAggregate);
        
        if (!aggregateAttr) {
          return of(VALID_RESULT); 
        }

        // Watch for changes to the aggregate value
        return aggregateAttr.value$.pipe(
          distinctUntilChanged(),
          switchMap(isAggregate => {

            if (!isAggregate || isAggregate === 'false') {
              return of(VALID_RESULT);
            }
            
            // If aggregate is true, check for alias attribute
            return node.attributes$.pipe(
              distinctUntilChanged((prev, curr) => prev.length === curr.length),
              switchMap(nodeAttributes => {
                const aliasAttr = nodeAttributes.find(attr => attr.editorName === AttributeNames.attributeAlias);
                
                if (!aliasAttr) {
                  return of({
                    isValid: false,
                    errors: ['Alias attribute is required when using aggregation.']
                  });
                }
                
                // Check if alias has a value
                return aliasAttr.value$.pipe(
                  distinctUntilChanged(),
                  map(alias => {
                    if (alias.trim() === '') {
                      return {
                        isValid: false,
                        errors: ['Alias is required when using aggregation.']
                      };
                    }
                    return VALID_RESULT;
                  })
                );
              })
            );
          })
        );
      })
    );
  }
}
