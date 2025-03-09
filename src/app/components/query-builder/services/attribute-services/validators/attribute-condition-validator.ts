import { of, Observable } from "rxjs";
import { DataverseEntityTypeNames } from "../../../models/constants/dataverse-entity-type-names";
import { NodeAttribute } from "../../../models/node-attribute";
import { IAttributeValidator } from "../abstract/i-attribute-validator";
import { ValidationResult } from "../../validation.service";

export class AttributeConditionValidator implements IAttributeValidator {

    constructor(private validationType: string) { }

    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        switch (this.validationType) {
            case DataverseEntityTypeNames.entity:
                return of({ isValid: true, errors: [] });
            default:
                return of({ isValid: true, errors: [] });
        }
    }
}