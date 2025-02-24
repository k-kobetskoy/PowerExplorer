import { Observable, of } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidationResult } from '../abstract/i-attribute-validation-result';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNode } from '../../../models/query-node';
import { QueryNodeData } from '../../../models/constants/query-node-data';

export class FilterValidator implements IAttributeValidator {
    constructor() {}

    getValidator(attribute: NodeAttribute): () => IAttributeValidationResult {
        return () => this.validateFilterStructure(attribute.parentNode);
    }

    private validateFilterStructure(node: QueryNode): IAttributeValidationResult {
        // Check if filter has at least one condition
        const hasCondition = node.next && node.next.nodeName === QueryNodeData.Condition.Name;

        return {
            isValid$: of(Boolean(hasCondition)),
            errorMessage: hasCondition ? '' : 'Filter must have at least one condition'
        };
    }
} 