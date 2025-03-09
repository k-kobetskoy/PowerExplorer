import { Observable } from 'rxjs';
import { NodeAttribute } from "../../../models/node-attribute";
import { ValidationResult } from '../../validation.service';

export interface IAttributeValidator {
    getValidator(attribute: NodeAttribute): Observable<ValidationResult>;
}
