import { BehaviorSubject, Observable } from "rxjs";
import { NodeAttribute } from "./node-attribute";
import { INodeData, QueryNodeData } from "./constants/query-node-data";
import { IAttributeData } from "./constants/attribute-data";
import { Inject } from '@angular/core';
import { AttributeFactoryResorlverService } from "../services/attribute-services/attribute-factory-resorlver.service";
import { IAttributeFactory } from "../services/attribute-services/abstract/i-attribute-validators-factory";

export class QueryNode {
    defaultNodeDisplayValue: string;
    order: number;
    attributes$: BehaviorSubject<NodeAttribute[]>;
    attributesCount: number;
    expandable: boolean;
    nodeName: string;
    tagName: string;
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
    tagDisplayValue$: Observable<string>;
    nodeDisplayValue$: Observable<string>;
    attributeFactory: IAttributeFactory;

    @Inject(AttributeFactoryResorlverService) private static attributeFactoryResolver: AttributeFactoryResorlverService;

    constructor(nodeName: string) {
        this.expandable = false;
        this.level = 0;
        this.visible = true;
        this.isExpanded = true;
        this.next = null;

        const nodeData: INodeData = QueryNodeData[nodeName]
        this.defaultNodeDisplayValue = nodeData.Name;
        this.nodeName = nodeData.Name;
        this.tagName = nodeData.TagName;
        this.order = nodeData.Order;
        this.actions = nodeData.Actions;
        this.attributesCount = nodeData.AttributesCount;
        this.attributes$ = new BehaviorSubject<NodeAttribute[]>([]);

        this.tagDisplayValue$ = new BehaviorSubject<string>(this.defaultNodeDisplayValue);

        this.attributeFactory = QueryNode.attributeFactoryResolver.getAttributesFactory(nodeName);
    }

    validateNode(): Observable<boolean> {
        return new Observable<boolean>(observer => {
            observer.next(true);
        })
    };

    getParentEntity(node: QueryNode = this): QueryNode {
        if (node.nodeName === QueryNodeData.Root.Name) return null;

        const parent = node.parent;

        if (!parent) throw new Error('Parent not found');

        if (parent?.nodeName === QueryNodeData.Entity.Name || parent?.nodeName === QueryNodeData.Link.Name) {
            return parent;
        } else {
            return this.getParentEntity(parent);
        }
    }

    setAttribute(attributeData: IAttributeData, value: string): void {
        let attribute = this.attributes$.value[attributeData.Order - 1];

        if (attribute) {
            attribute.value$.next(value);
        }
        else {
            attribute = this.attributeFactory.createAttribute(attributeData.EditorName, this, false, value);
            this.addAttribute(attribute);
        }
    }

    getParentEntityName(node: QueryNode = this): BehaviorSubject<string> {
        const parent = this.getParentEntity(node);

        if (!parent) return new BehaviorSubject<string>('');

        return parent.attributes$.value.find(a => a.editorName === 'name').value$;
    }

    addAttribute(attribute: NodeAttribute): void {
        let attributes = this.attributes$.value;

        let isUndefinedAttribute = attribute.order > this.attributesCount;

        if (isUndefinedAttribute) {
            this.addToLastFreePosition(attribute, attributes);
        }
        else {
            attributes.splice(attribute.order - 1, 0, attribute);
        }

        this.attributes$.next(attributes);
    }

    private addToLastFreePosition(attribute: NodeAttribute, attributes: NodeAttribute[]): void {
        let indexToInsert = this.attributesCount - 1;

        while (attributes[indexToInsert] !== undefined) {
            indexToInsert++;
        }

        this.attributesCount = indexToInsert + 1;
        attributes[indexToInsert] = attribute;
    }
}
