import { Injectable } from '@angular/core';
import { QueryNode } from 'src/app/components/query-builder/models/query-node';
import { ValidationResult } from '../../../../validation.service';
import { QueryNodeData } from 'src/app/components/query-builder/models/constants/query-node-data';
import { INodeOneTimeValidator } from '../../../abstract/i-node-one-time-validator';

@Injectable({ providedIn: 'root' })

/**
 * Parser Validation Only
 * Validates that the node name is valid.
 * 
 */

export class NodeNameValidatorService implements INodeOneTimeValidator {

  constructor() { }

  validate(node: QueryNode): ValidationResult {
    if (!node) {
      return {
        isValid: false,
        errors: ['Node is required']
      };
    }

    const isValid = QueryNodeData.TagNames.includes(node.tagName);

    return {
      isValid: isValid,
      errors: isValid ? [] : ['Node is not valid']
    }
  }
}
