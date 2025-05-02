import { Observable } from 'rxjs';
import { QueryNode } from "../../../models/query-node";
import { ValidationResult } from '../../validation.service';

export interface INodeValidator {
    validate(node: QueryNode): Observable<ValidationResult>;
}
