import { Injectable } from '@angular/core';
import { AttributeEntityService } from '../../../entity-services/attribute-entity.service';
import { IAttributeValidator } from '../../abstract/i-attribute-validator';
import { NodeAttribute } from '../../../../models/node-attribute';
import { Observable, catchError, distinctUntilChanged, map, of, switchMap, takeUntil } from 'rxjs';
import { VALID_RESULT, ValidationResult } from '../../../validation.service';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';

@Injectable({ providedIn: 'root' })
export class FromAttributeLinkEntityServerValidatorService implements IAttributeValidator {

  constructor(private attributeService: AttributeEntityService) { }

  validate(attribute: NodeAttribute): Observable<ValidationResult> {
    const parentNode = attribute.parentNode;

    const entityNameAttribute$ = parentNode.attributes$.pipe(
      map(attributes => attributes.find(attr => attr.editorName === AttributeNames.linkEntity))
    );

    return entityNameAttribute$.pipe(
      switchMap(entityNameAttribute => {
        if (!entityNameAttribute) {
          return of({
            isValid: false,
            errors: ['Please setup a parent entity']
          });
        }
        return entityNameAttribute.validationResult$.pipe(
          switchMap(validationResult => {
            if (!validationResult.isValid) {
              return of({
                isValid: false,
                errors: ['Please setup a valid parent entity']
              });
            }

            return attribute.value$.pipe(
              distinctUntilChanged(),
              switchMap(attributeValue => {
                if (!attributeValue) {
                  return of({
                    isValid: false,
                    errors: ['Please setup a valid parent entity']
                  });
                }
                return this.attributeService.getAttributes(entityNameAttribute.value$.value).pipe(
                  map(attributes => {
                    if (!attributes || attributes.length === 0) {
                      return {
                        isValid: false,
                        errors: ['Please setup a valid parent entity']
                      };
                    }
                    const attribute = attributes.find(attr => attr.logicalName.toLowerCase() === attributeValue.toLowerCase());
                    return attribute ? VALID_RESULT : {
                      isValid: false,
                      errors: ['Please setup a valid parent entity']
                    };
                  })
                );
              })
            )
          })
        );
      }), takeUntil(attribute?.destroyed$),
      catchError(error => {
        console.error('Error in attribute validation:', error);
        return of({
          isValid: false,
          errors: ['Validation error. Please check your configuration.']
        });
      })
    );

  }

}
