import { Observable, of, map } from 'rxjs';
import { NodeAttribute } from '../../../models/node-attribute';
import { IAttributeValidator } from '../abstract/i-attribute-validator';
import { QueryNodeData } from '../../../models/constants/query-node-data';
import { ValidationResult } from '../../validation.service';

/**
 * Parser Validation Only
 * Validates that the node has only allowed attributes. 
 *  Each node should hava a list of allowed attributes as a constant
 */
export class AttributeNameValidator implements IAttributeValidator {
    
    getValidator(attribute: NodeAttribute): Observable<ValidationResult> {
        // Only validate name attributes of Attribute nodes
        if (attribute.parentNode?.nodeName === QueryNodeData.Attribute.Name && 
            attribute.editorName === 'name') {
            return this.validateAttributeName(attribute);
        }
        
        // For other attributes, just return valid
        return of({ isValid: true, errors: [] });
    }
    
    private validateAttributeName(attribute: NodeAttribute): Observable<ValidationResult> {
        return attribute.value$.pipe(
            map(value => {
                // Attribute nodes must have a name property with a non-empty value
                const isValid = !!value && value.toString().trim().length > 0;
                
                return {
                    isValid,
                    errors: isValid ? [] : ['Attribute name is required. Empty attribute tags are not valid in FetchXML.']
                };
            })
        );
    }
} 