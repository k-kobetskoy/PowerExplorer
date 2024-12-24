import { IQueryNode } from "../../../models/abstract/OBSOLETE i-query-node";

export interface INodeAdder {
    addNode(newNodeType: string, parentNode?: IQueryNode): IQueryNode;
}
