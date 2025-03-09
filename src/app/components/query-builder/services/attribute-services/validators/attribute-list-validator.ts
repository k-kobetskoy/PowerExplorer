import { Observable, of } from "rxjs";
import { DataverseEntityTypeNames } from "../../../models/constants/dataverse-entity-type-names";
import { NodeAttribute } from "../../../models/node-attribute";
import { IAttributeValidator } from "../abstract/i-attribute-validator";
import { ValidationResult } from "../../validation.service";

const VALID_RESULT: Readonly<ValidationResult> = {
    isValid: true,
    errors: [] as string[]
};

export class AttributeListValidator implements IAttributeValidator {

    constructor(private validationType: string) { }

    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        switch (this.validationType) {
            case DataverseEntityTypeNames.entity:
                return of(VALID_RESULT);
            default:
                return of(VALID_RESULT);
        }
    }    
}
