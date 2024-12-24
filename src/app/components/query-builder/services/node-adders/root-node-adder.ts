import { IQueryNode } from "../../models/abstract/OBSOLETE i-query-node";
import { BaseNodeAdder } from "./abstract/base-node-adder";

export class RootNodeAdder extends BaseNodeAdder{
    
    override addNode(rootNodeType: string, selectedNode: IQueryNode): IQueryNode {
        return this.nodeFactory.createNode(rootNodeType);
    }
}
