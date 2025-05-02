import { Observable, of } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNode } from '../../../models/query-node';
import { QueryNodeData } from '../../../models/constants/query-node-data';
import { ValidationResult } from '../../validation.service';

export class FilterValidator implements IAttributeValidator {
    constructor() {}

    validate(attribute: NodeAttribute): Observable<ValidationResult> {
        return this.validateFilterStructure(attribute.parentNode);
    }

    private validateFilterStructure(node: QueryNode): Observable<ValidationResult> {
        // Check if filter has at least one condition
        const hasCondition = node.next && node.next.nodeName === QueryNodeData.Condition.NodeName;

        return of({
            isValid: Boolean(hasCondition),
            errors: hasCondition ? [] : ['Filter must have at least one condition']
        });
    }
} 