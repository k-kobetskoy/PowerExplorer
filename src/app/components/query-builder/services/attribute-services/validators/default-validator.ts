import { Observable, of } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidationResult } from '../abstract/i-attribute-validation-result';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNode } from '../../../models/query-node';
import { QueryNodeData } from '../../../models/constants/query-node-data';

export class DefaultValidator implements IAttributeValidator {
    constructor() {}

    getValidator(attribute: NodeAttribute): () => IAttributeValidationResult {
        return () => this.validateEntityName(attribute.parentNode);
    }

    private validateEntityName(node: QueryNode): IAttributeValidationResult {
       
        const isValidNodeName = QueryNodeData.NodesNames.includes(node.nodeName);
    
        return {
            isValid$: of(Boolean(isValidNodeName)),
            errorMessage: isValidNodeName ? '' : `${node.nodeName} is not a valid node name`
        };
    }
} 
