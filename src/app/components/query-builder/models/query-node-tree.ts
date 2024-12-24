import { QueryNode } from "./query-node";

export class QueryNodeTree implements Iterable<QueryNode> {
    root: QueryNode
    current: QueryNode

    addNode(node: QueryNode) {
        if (!this.root) {
            this.root = node;
            this.current = node;
        } else {
            this.current.next = node
        }
    }

    [Symbol.iterator](): Iterator<QueryNode, any, undefined> {

        let current = this.root

        return {
            next: () => {
                if (current) {
                    let val = current
                    current = current.next
                    return { done: false, value: val };
                } else {
                    return { done: true, value: null };
                }
            }
        }
    }
}