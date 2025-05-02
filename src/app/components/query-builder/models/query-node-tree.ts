import { QueryNode } from "./query-node";
import { Subject } from "rxjs";
export class QueryNodeTree implements Iterable<QueryNode> {
    root: QueryNode
    destroyed$: Subject<void> = new Subject<void>();

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