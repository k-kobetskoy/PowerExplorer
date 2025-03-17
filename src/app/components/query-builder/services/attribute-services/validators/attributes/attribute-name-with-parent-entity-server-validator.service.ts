import { Injectable } from '@angular/core';
import { AttributeEntityService } from '../../../entity-services/attribute-entity.service';
import { IAttributeValidator } from '../../abstract/i-attribute-validator';
import { catchError, distinctUntilChanged, NEVER, Observable, of, switchMap, map, combineLatest, takeUntil } from 'rxjs';
import { NodeAttribute } from '../../../../models/node-attribute';
import { ValidationResult } from '../../../validation.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';

const VALID_RESULT: Readonly<ValidationResult> = {
  isValid: true,
  errors: [] as string[]
};

@Injectable({ providedIn: 'root' })

export class AttributeNameWithParentEntityServerValidatorService implements IAttributeValidator {

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
        const entityNameAttr = attributes.find(attr => attr.editorName === 'name');
        if (!entityNameAttr) {
          return of({
            isValid: false,
            errors: ['Parent entity is missing a name attribute']
          });
        }

        return combineLatest([
          attribute.value$,
          entityNameAttr.value$
        ]).pipe(
          distinctUntilChanged(),
          switchMap(([attributeName, entityLogicalName]) => {
            if (!attributeName) {
              return of({
                isValid: false,
                errors: ['Please enter an attribute name']
              });
            }

            if (!entityLogicalName) {
              return of({
                isValid: false,
                errors: ['Please set a name for the parent entity first']
              });
            }

            const attrName = attributeName.toString().trim();
            const entityName = entityLogicalName.toString().trim();

            return this.attributeService.getAttributes(entityName).pipe(
              map((attributes: AttributeModel[]) => {
                if (!attributes || attributes.length === 0) {
                  return {
                    isValid: false,
                    errors: [`Please verify the entity name.`]
                  };
                }

                const attributeWithProvidedName = attributes.find(attr =>
                  attr.logicalName.toLowerCase() === attrName.toLowerCase());

                return attributeWithProvidedName
                  ? VALID_RESULT
                  : {
                    isValid: false,
                    errors: [`'${attrName}' is not a valid attribute.`]
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
