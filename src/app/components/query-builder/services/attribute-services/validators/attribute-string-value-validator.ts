import { of, distinctUntilChanged, debounceTime, map } from "rxjs";
import { NodeAttribute } from "../../../models/node-attribute";
import { IAttributeValidationResult } from "../abstract/i-attribute-validation-result";
import { AttributeValidationTypes } from "../constants/attribute-validation-types";
import { IAttributeValidator } from "../abstract/i-attribute-validator";

export class AttributeStringValueValidator implements IAttributeValidator {

    constructor(private validationType: string) { }

    getValidator(attribute: NodeAttribute): () => IAttributeValidationResult {
        switch (this.validationType) {
            case AttributeValidationTypes.alias:
                return () => this.validateAlias(attribute);
            default:
                return () => ({ isValid$: of(true), errorMessage: '' });
        }
    }

    private validateAlias(attribute: NodeAttribute): IAttributeValidationResult {
        const isValid = attribute.value$.pipe(
            distinctUntilChanged(),
            debounceTime(300),
            map(value => this.isValidAlias(String(value || '')))
        );

        return {
            isValid$: isValid,
            errorMessage: `Value for '${attribute.editorName}' has incorrect format.`
        };
    }

    private isValidAlias(value: string): boolean {
        if (!value) return true;
        return isNaN(Number(value.charAt(0))) && !/\s/.test(value);
    }
}
