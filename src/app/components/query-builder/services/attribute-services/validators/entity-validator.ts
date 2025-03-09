import { Observable, of } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNode } from '../../../models/query-node';
import { ValidationResult } from '../../validation.service';

export class EntityValidator implements IAttributeValidator {
    constructor() {}

    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        return this.validateEntityStructure(attribute.parentNode);
    }

    private validateEntityStructure(node: QueryNode): Observable<ValidationResult> {
        // Check if entity has a name attribute
        const nameAttr = node.attributes$.value.find(a => a.editorName === 'name');
        const hasValidName = nameAttr && nameAttr.value$.value;

        return of({
            isValid: Boolean(hasValidName),
            errors: hasValidName ? [] : [`${node.nodeName} must have a name`]
        });
    }
} 