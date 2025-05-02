import { Observable, of } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNode } from '../../../models/query-node';
import { ValidationResult } from '../../validation.service';

export class ConditionValidator implements IAttributeValidator {
    constructor() {}

    validate(attribute: NodeAttribute): Observable<ValidationResult> {
        return this.validateConditionStructure(attribute.parentNode);
    }

    private validateConditionStructure(node: QueryNode): Observable<ValidationResult> {
        const hasRequiredAttrs = node.attributes$.value.some(a => a.editorName === 'attribute') &&
                               node.attributes$.value.some(a => a.editorName === 'operator');

        return of({
            isValid: Boolean(hasRequiredAttrs),
            errors: hasRequiredAttrs ? [] : ['Condition must have attribute and operator']
        });
    }
} 