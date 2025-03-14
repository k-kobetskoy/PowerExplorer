import { NodeAttribute } from "../../../models/node-attribute";
import { QueryNode } from "../../../models/query-node";

export interface IAttributesService {
    getAttribute(node: QueryNode, attributeName: string, attributeValue?: string): NodeAttribute;
}
