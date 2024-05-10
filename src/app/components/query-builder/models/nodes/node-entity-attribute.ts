import { INodeProperty } from "../abstract/i-node-property";
import { QueryNodeActions } from "../constants/query-node-actions";
import { QueryNodeOrder } from "../constants/query-node-order.enum";
import { QueryNodeType } from "../constants/query-node-type";
import { QueryNode } from "../abstract/query-node";

export class NodeEntityAttribute extends QueryNode {

    constructor(nodeProperty: INodeProperty) {
        super(nodeProperty);
        this.defaultDisplayValue = QueryNodeType.ATTRIBUTE;
        this.displayValue = QueryNodeType.ATTRIBUTE;
        this.order = QueryNodeOrder.ATTRIBUTE;
        this.type = QueryNodeType.ATTRIBUTE;
        this.actions = QueryNodeActions.ATTRIBUTE;        
    }
}
