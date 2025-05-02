import { Injectable } from '@angular/core';
import { Observable, of, distinctUntilChanged, switchMap, combineLatest, map, catchError, takeUntil, NEVER } from 'rxjs';
import { NodeAttribute } from 'src/app/components/query-builder/models/node-attribute';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../../entity-services/attribute-entity.service';
import { ValidationResult, VALID_RESULT } from '../../../validation.service';
import { IAttributeValidator } from '../../abstract/i-attribute-validator';
import { AttributeNames } from 'src/app/components/query-builder/models/constants/attribute-names';
@Injectable({ providedIn: 'root' })

/**
 * Validates attribute name against the parent entity. Condition node validation. 
 */

export class ConditionAttributeNameValidatorService implements IAttributeValidator {

  constructor(private attributeService: AttributeEntityService) { }

  validate(attribute: NodeAttribute): Observable<ValidationResult> {
    const parentEntity = attribute.parentNode.getParentEntity();
    if (!parentEntity) {
      return of({
        isValid: false,
        errors: ['Please add this attribute to a valid entity']
      });
    }

    return parentEntity.attributes$.pipe(
      distinctUntilChanged((prev, curr) => prev.length === curr.length),
      switchMap((attributes: NodeAttribute[]) => {
        const entityNameAttr = attributes.find(attr => attr.editorName === AttributeNames.entityName);
        if (!entityNameAttr) {
          return of({
            isValid: false,
            errors: ['Parent entity is missing a name attribute']
          });
        }

        return entityNameAttr.validationResult$.pipe(
          switchMap(isValid => {
            if (!isValid.isValid) {
              return of({
                isValid: false,
                errors: ['Invalid entity name']
              });
            }

            return combineLatest([
              attribute.value$,
              entityNameAttr.value$
            ]).pipe(
              distinctUntilChanged((prev, curr) => prev[0] === curr[0] && prev[1] === curr[1]),
              switchMap(([attributeNameValue, entityLogicalName]) => {
                if (!attributeNameValue) {
                  return of({
                    isValid: false,
                    errors: ['Please enter an attribute name']
                  });
                }
                return this.attributeService.getAttributes(entityLogicalName).pipe(
                  map((attributes: AttributeModel[]) => {
                    if (!attributes || attributes.length === 0) {
                      return {
                        isValid: false,
                        errors: [`Please verify the entity name.`]
                      };
                    }

                    const matchingAttribute = attributes.find(attr =>
                      attr.logicalName.toLowerCase() === attributeNameValue.toLowerCase());
                    
                    if (matchingAttribute) {
                      attribute.setAttributeModel(matchingAttribute);
                    }

                    return matchingAttribute
                      ? VALID_RESULT
                      : {
                        isValid: false,
                        errors: [`'${attributeNameValue}' is not a valid attribute.`]
                      };
                  }),
                  catchError(error => {
                    console.error('Error fetching attributes:', error);
                    return of({
                      isValid: false,
                      errors: ['Error validating attribute. Please check attribute and entity configuration.']
                    });
                  })
                );
              })
            );
          })
        );
      }),
      takeUntil(attribute?.destroyed$ || NEVER),
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
