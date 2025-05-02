import { QueryNode } from "../../../models/query-node";
import { ValidationResult } from '../../validation.service';

export interface INodeOneTimeValidator {
    validate(node: QueryNode): ValidationResult;
}
