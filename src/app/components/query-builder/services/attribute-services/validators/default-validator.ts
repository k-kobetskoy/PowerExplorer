import { Observable, of } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNode } from '../../../models/query-node';
import { QueryNodeData } from '../../../models/constants/query-node-data';
import { ValidationResult } from '../../validation.service';

export class DefaultValidator implements IAttributeValidator {
    constructor() {}

    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        return this.validateEntityName(attribute.parentNode);
    }

    private validateEntityName(node: QueryNode): Observable<ValidationResult> {
        const isValidNodeName = QueryNodeData.NodesNames.includes(node.nodeName);
        
        return of({
            isValid: Boolean(isValidNodeName),
            errors: isValidNodeName ? [] : [`${node.nodeName} is not a valid node name`]
        });
    }
} 
