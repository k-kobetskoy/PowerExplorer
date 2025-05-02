import { NodeAttribute } from "../../../models/node-attribute";
import { ValidationResult } from '../../validation.service';

export interface IAttributeOneTimeValidator {
    validate(attribute: NodeAttribute): ValidationResult;
}
