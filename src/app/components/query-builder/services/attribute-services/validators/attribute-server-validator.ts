import { AttributeValidationTypes } from './../constants/attribute-validation-types';
import { of, distinctUntilChanged, debounceTime, map, Observable, switchMap } from "rxjs";
import { NodeAttribute } from "../../../models/node-attribute";
import { IAttributeValidationResult } from "../abstract/i-attribute-validation-result";
import { EntityServiceFactoryService } from "../../entity-service-factory.service";
import { EntityEntityService } from "../../entity-services/entity-entity.service";
import { IAttributeValidator } from "../abstract/i-attribute-validator";

interface HasLogicalName {
    logicalName: string;
}

export class AttributeServerValidator implements IAttributeValidator {

    constructor(private validationType: string, private entityServiceFactory: EntityServiceFactoryService) { }

    getValidator(attribute: NodeAttribute): () => IAttributeValidationResult {
        if (this.validationType === AttributeValidationTypes.serverEntity) {
            return () => this.validateEntity(attribute);
        }
        
        return () => ({ isValid$: of(true), errorMessage: '' });
    }

    private validateEntity(attribute: NodeAttribute): IAttributeValidationResult {
        const entityService = this.entityServiceFactory.getEntityService(this.validationType) as EntityEntityService;

        const isValid: Observable<boolean> = entityService.getEntities().pipe(
            distinctUntilChanged(),
            switchMap(entities => {
                return attribute.value$.pipe(
                    distinctUntilChanged(),
                    map((value: string | HasLogicalName | any) => {
                        if (!value) return true;
                        
                        const logicalName = typeof value === 'object' && value && 'logicalName' in value
                            ? (value as HasLogicalName).logicalName
                            : value;
                            
                        const entity = entities.find(e => e.logicalName === logicalName);
                        
                        if (entity) {
                            attribute.parentNode.entitySetName$.next(entity.entitySetName);
                            return true;
                        }
                        
                        return false;
                    })
                );
            })
        );

        return {
            isValid$: isValid,
            errorMessage: 'Entity not found'
        };
    }
}