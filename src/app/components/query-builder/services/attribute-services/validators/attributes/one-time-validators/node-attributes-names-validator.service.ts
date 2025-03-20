import { Injectable } from '@angular/core';
import { NodeAttribute } from 'src/app/components/query-builder/models/node-attribute';
import { ValidationResult } from '../../../../validation.service';
import { IAttributeOneTimeValidator } from '../../../abstract/i-attribute-one-time-validator';
import { QueryNodeData } from 'src/app/components/query-builder/models/constants/query-node-data';
@Injectable({ providedIn: 'root' })

/**
 * Parser Validation Only
 * Validates that the node has only allowed attributes. 
 * Each node should hava a list of allowed attributes as a constant
 */

export class NodeAttributesNamesValidatorService implements IAttributeOneTimeValidator {

  constructor() { }

  validate(attribute: NodeAttribute): ValidationResult {

    const allowedAttributes = QueryNodeData.getNodeAttributes(attribute.parentNode.nodeName);

    return {
      isValid: allowedAttributes.includes(attribute.editorName),
      errors: allowedAttributes.includes(attribute.editorName) ? [] : [`Invalid attribute name: ${attribute.editorName}`]
    };
  }
}
