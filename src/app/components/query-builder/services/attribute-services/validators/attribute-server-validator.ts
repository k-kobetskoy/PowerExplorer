import { AttributeValidationTypes } from './constants/attribute-validation-types';
import { of, distinctUntilChanged,  map, Observable, switchMap, combineLatest, shareReplay, catchError, takeUntil, NEVER, Subject } from "rxjs";
import { NodeAttribute } from "../../../models/node-attribute";
import { EntityServiceFactoryService } from "../../entity-service-factory.service";
import { EntityEntityService } from "../../entity-services/entity-entity.service";
import { IAttributeValidator } from "../abstract/i-attribute-validator";
import { ValidationResult } from "../../validation.service";
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { AttributeEntityService } from '../../entity-services/attribute-entity.service';

const VALID_RESULT: Readonly<ValidationResult> = {
    isValid: true,
    errors: [] as string[]
};

interface HasLogicalName {
    logicalName: string;
}

export class AttributeServerValidator implements IAttributeValidator {

    constructor(
        private validationType: string,
        private entityServiceFactory: EntityServiceFactoryService,
        private attributeService: AttributeEntityService) { }

    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        if (this.validationType === AttributeValidationTypes.serverEntity) {
            return this.validateEntity(attribute);
        }

        if (this.validationType === AttributeValidationTypes.serverParentEntityAttribute) {
            return this.validateAttributeWithParentEntity(attribute);
        }

        return of(VALID_RESULT);
    }

    private validateEntity(attribute: NodeAttribute): Observable<ValidationResult> {
        const entityService = this.entityServiceFactory.getEntityService(this.validationType) as EntityEntityService;

        return entityService.getEntities().pipe(
            distinctUntilChanged(),
            switchMap(entities => {
                return attribute.value$.pipe(
                    distinctUntilChanged(),
                    map((value: string | HasLogicalName | any) => {
                        if (!value) return VALID_RESULT;

                        const logicalName = typeof value === 'object' && value && 'logicalName' in value
                            ? (value as HasLogicalName).logicalName
                            : value;

                        const entity = entities.find(e => e.logicalName === logicalName);

                        if (entity) {
                            attribute.parentNode.entitySetName$.next(entity.entitySetName);
                            return VALID_RESULT;
                        }

                        return {
                            isValid: false,
                            errors: [`Entity '${logicalName}' not found. Please verify the entity name.`]
                        };
                    })
                );
            }),
            takeUntil(attribute?.destroyNotifier$ || NEVER),
            shareReplay(1)
        );
    }

    private validateAttributeWithParentEntity(attribute: NodeAttribute): Observable<ValidationResult> {
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

                                return attributeExists
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
            takeUntil(attribute?.destroyNotifier$ || NEVER),
            shareReplay(1),
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
