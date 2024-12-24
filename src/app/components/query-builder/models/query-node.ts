import { BehaviorSubject, Observable } from "rxjs";
import { NodeAttribute } from "./node-attribute";
import { INodeData, QueryNodeData } from "./constants/query-node-data";

export class QueryNode {
    defaultNodeDisplayValue: string;
    order: number;
    attributes: NodeAttribute[];
    expandable: boolean;
    name: string;
    id?: string;
    actions?: string[];
    level?: number;
    isExpanded?: boolean;
    next?: QueryNode | null;
    parent?: QueryNode | null;
    visible: boolean;
    validationErrors$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    entitySetName$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    relationship$?: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    showOnlyLookups$?: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    validationPassed$: Observable<boolean>;

    constructor(nodeName: string) {
        this.expandable = false;
        this.level = 0;
        this.visible = true;
        this.isExpanded = true;
        this.next = null;

        const nodeData: INodeData = QueryNodeData[nodeName]
        this.defaultNodeDisplayValue = nodeData.Name;
        this.name = nodeData.Name;
        this.order = nodeData.Order;
        this.actions = nodeData.Actions;
        this.attributes = new Array<NodeAttribute>(nodeData.AttributesArrayCapacity);
    }

    validateNode(): Observable<boolean> {
        return new Observable<boolean>(observer => {
            observer.next(true);
        })
    };

    // get displayValue$(): Observable<IPropertyDisplay> {
    //     return new Observable<IPropertyDisplay>(observer => {
    //         observer.next({ nodePropertyDisplay: this.defaultNodeDisplayValue, tagPropertyDisplay: this.tagProperties.tagName });
    //     });
    // }

    getParentEntity(node: QueryNode = this): QueryNode {

        if (node.name === QueryNodeData.Root.Name) return null;

        const parent = node.parent;

        if (!parent) throw new Error('Parent not found');

        if (parent?.name === QueryNodeData.Entity.Name || parent?.name === QueryNodeData.Link.Name) {
            return parent;
        } else {
            return this.getParentEntity(parent);
        }
    }

    getParentEntityName(node: QueryNode = this): BehaviorSubject<string> {
        const parent = this.getParentEntity(node);

        if (!parent) return new BehaviorSubject<string>('');

        return parent.tagProperties.entityName?.constructorValue$ ?? parent.tagProperties.linkEntity.constructorValue$;
    }

    addAttribute(attribute: NodeAttribute): void {
        let low = 0;
        let high = this.attributes.length;

        while (low < high) {
            const mid = (low + high) >>> 1;
            if (this.attributes[mid].order < attribute.order) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        this.attributes.splice(low, 0, attribute);
    }
}
