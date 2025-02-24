import { Observable, of } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidationResult } from '../abstract/i-attribute-validation-result';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNode } from '../../../models/query-node';

export class ConditionValidator implements IAttributeValidator {
    constructor() {}

    getValidator(attribute: NodeAttribute): () => IAttributeValidationResult {
        return () => this.validateConditionStructure(attribute.parentNode);
    }

    private validateConditionStructure(node: QueryNode): IAttributeValidationResult {
        // Check if condition has required attributes
        const hasRequiredAttrs = node.attributes$.value.some(a => a.editorName === 'attribute') &&
                               node.attributes$.value.some(a => a.editorName === 'operator');

        return {
            isValid$: of(Boolean(hasRequiredAttrs)),
            errorMessage: hasRequiredAttrs ? '' : 'Condition must have attribute and operator'
        };
    }
} 