import { Observable, distinctUntilChanged, map, of, switchMap, combineLatest, shareReplay } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { AttributeEntityService } from '../../entity-services/attribute-entity.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { ValidationResult } from '../../validation.service';

/**
 * Validations for the attributes that needs dataverse calls to validate
 * 
 */
export class AttributeEntityValidator implements IAttributeValidator {
    constructor(private attributeService: AttributeEntityService) { }

    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        try {
            const parentEntity = attribute.parentNode.getParentEntity();
            if (!parentEntity) {
                return of({
                    isValid: false,
                    errors: ['Please add this attribute to a valid entity']
                });
            }

            const entityNameAttr = parentEntity.findAttribute('name');
            if (!entityNameAttr) {
                return of({
                    isValid: false,
                    errors: ['Parent entity is missing a name attribute']
                });
            }

            return combineLatest([
                attribute.value$.pipe(distinctUntilChanged()),
                entityNameAttr.value$.pipe(distinctUntilChanged())
            ]).pipe(
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

                    return this.attributeService.getAttributes(entityName, parentEntity).pipe(
                        map((attributes: AttributeModel[]) => {
                            if (!attributes || attributes.length === 0) {
                                return {
                                    isValid: false,
                                    errors: [`Please verify the entity name.`]
                                };
                            }

                            const attributeExists = attributes.some(attr =>
                                attr.logicalName.toLowerCase() === attrName.toLowerCase());

                            if (attributeExists) {
                                return { isValid: true, errors: [] };
                            } else {
                                return {
                                    isValid: false,
                                    errors: [`'${attrName}' is not a valid attribute.`]
                                };
                            }
                        })
                    );
                }),
                shareReplay(1)
            );
        } catch (error) {
            return of({
                isValid: false,
                errors: [`Validation error: ${error.message || 'Unknown error'}`]
            });
        }
    }
} 