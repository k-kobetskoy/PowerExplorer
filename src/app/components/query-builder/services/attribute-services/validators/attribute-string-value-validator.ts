import { of, distinctUntilChanged, debounceTime, map, Observable } from "rxjs";
import { NodeAttribute } from "../../../models/node-attribute";
import { AttributeValidationTypes } from "./constants/attribute-validation-types";
import { IAttributeValidator } from "../abstract/i-attribute-validator";
import { ValidationResult } from "../../validation.service";

const VALID_RESULT: Readonly<ValidationResult> = {
    isValid: true,
    errors: [] as string[]
};

export class AttributeStringValueValidator implements IAttributeValidator {

    constructor(private validationType: string) { }

    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        switch (this.validationType) {
            case AttributeValidationTypes.alias:
                return this.validateAlias(attribute);
            default:
                return of(VALID_RESULT);
        }
    }

    private validateAlias(attribute: NodeAttribute): Observable<ValidationResult> {
        return attribute.value$.pipe(
            distinctUntilChanged(),
            map(value => {
                const isValid = this.isValidAlias(String(value || ''));
                return {
                    isValid,
                    errors: isValid ? [] : [`Value for '${attribute.editorName}' has incorrect format.`]
                };
            })
        );
    }

    private isValidAlias(value: string): boolean {
        if (!value) return true;
        return isNaN(Number(value.charAt(0))) && !/\s/.test(value);
    }
}
