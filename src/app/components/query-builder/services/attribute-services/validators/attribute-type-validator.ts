import { AttributeValidationTypes } from './constants/attribute-validation-types';
import { distinctUntilChanged, map, Observable, of } from 'rxjs';
import { IAttributeValidator } from "../abstract/i-attribute-validator";
import { NodeAttribute } from '../../../models/node-attribute';
import { ValidationResult } from '../../validation.service';

const VALID_RESULT: Readonly<ValidationResult> = {
    isValid: true,
    errors: [] as string[]
};

export class AttributeTypeValidator implements IAttributeValidator {

    constructor(private validationType: string) { }

    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        switch (this.validationType) {
            case AttributeValidationTypes.typeNumber:
                return this.validateNumber(attribute);
            case AttributeValidationTypes.typeBoolean:
                return this.validateBoolean(attribute);
            default:
                return of(VALID_RESULT);
        }
    }

    private validateBoolean(attribute: NodeAttribute): Observable<ValidationResult> {
        return attribute.value$.pipe(
            distinctUntilChanged(),
            map(value => {
                const isValid = this.isBoolean(String(value || ''));
                return {
                    isValid,
                    errors: isValid ? [] : [`The value must be a boolean.`]
                };
            })
        );
    }

    private validateNumber(attribute: NodeAttribute): Observable<ValidationResult> {
        return attribute.value$.pipe(
            distinctUntilChanged(),
            map(value => {
                const isValid = this.isNumber(String(value || ''));
                return {
                    isValid,
                    errors: isValid ? [] : [`The value must be a number.`]
                };
            })
        );
    }

    private isNumber(value: string): boolean {
        if (!value) return true;
        const trimmedValue = value.trim();
        return trimmedValue === '' || !isNaN(Number(trimmedValue));
    }

    private isBoolean(value: string): boolean {
        if (!value) return true;
        const trimmedValue = value.trim().toLowerCase();
        return trimmedValue === '' || trimmedValue === 'true' || trimmedValue === 'false';
    }
}
