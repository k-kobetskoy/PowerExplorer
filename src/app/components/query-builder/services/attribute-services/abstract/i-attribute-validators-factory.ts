import { NodeAttribute } from "../../../models/node-attribute";
import { QueryNode } from "../../../models/query-node";

export interface IAttributeFactory {
    createAttribute(attributeName: string, node: QueryNode, parserValidation: boolean, value?: string): NodeAttribute;
}