import { Observable, of } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidationResult } from '../abstract/i-attribute-validation-result';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNode } from '../../../models/query-node';

export class EntityValidator implements IAttributeValidator {
    constructor() {}

    getValidator(attribute: NodeAttribute): () => IAttributeValidationResult {
        return () => this.validateEntityStructure(attribute.parentNode);
    }

    private validateEntityStructure(node: QueryNode): IAttributeValidationResult {
        // Check if entity has a name attribute
        const nameAttr = node.attributes$.value.find(a => a.editorName === 'name');
        const hasValidName = nameAttr && nameAttr.value$.value;

        return {
            isValid$: of(Boolean(hasValidName)),
            errorMessage: hasValidName ? '' : `${node.nodeName} must have a name`
        };
    }
} 