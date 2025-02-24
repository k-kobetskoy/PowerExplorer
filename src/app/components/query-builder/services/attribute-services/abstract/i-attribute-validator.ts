import { NodeAttribute } from "../../../models/node-attribute";
import { IAttributeValidationResult } from "./i-attribute-validation-result";

export interface IAttributeValidator {
    getValidator(attribute: NodeAttribute): () => IAttributeValidationResult;
}
