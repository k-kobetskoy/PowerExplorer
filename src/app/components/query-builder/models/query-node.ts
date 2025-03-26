import { INodeValidators } from './../services/attribute-services/abstract/i-node-validators';
import { BehaviorSubject, Observable, Subject, of } from "rxjs";
import { NodeAttribute } from "./node-attribute";
import { INodeData, QueryNodeData } from "./constants/query-node-data";
import { IAttributeData } from "./constants/attribute-data";
import { IAttributeFactory } from "../services/attribute-services/abstract/i-attribute-validators-factory";
import { ValidationResult, VALID_RESULT } from '../services/validation.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';

export class QueryNode {
    rootNode: QueryNode;
    defaultNodeDisplayValue: string;
    order: number;
    attributes$: BehaviorSubject<NodeAttribute[]> = new BehaviorSubject<NodeAttribute[]>([]);
    attributesCount: number;
    expandable: boolean;
    nodeName: string; // Fetch, Entity+, Condition +, Attribute +, Filter +/-, Link, Order, Value +
    tagName: string; // fetch, entity, condition, attribute, filter, link, order, value
    id?: string;
    actions?: string[];
    level?: number;
    isExpanded?: boolean;
    next?: QueryNode | null;
    parent?: QueryNode | null; // This is the parent node not the node above. 
    visible: boolean;
    entitySetName$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    relationship$?: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    showOnlyLookups$?: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    tagDisplayValue$: Observable<string>;
    nodeDisplayValue$: Observable<string>;

    validatiors: INodeValidators;
    validationResult$: Observable<ValidationResult> = of(VALID_RESULT);

    //TODO: implement this functionality later
    hasAggregateOrGroupByAttribute: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private readonly attributeFactory: IAttributeFactory;

    destroyed$ = new Subject<void>();

    constructor(
        nodeData: INodeData,
        attributeFactory: IAttributeFactory,
        nodeValidators: INodeValidators,
        rootNode: QueryNode
    ) {
        this.expandable = false;
        this.level = 0;
        this.visible = true;
        this.isExpanded = true;
        this.next = null;

        this.defaultNodeDisplayValue = nodeData.NodeName;
        this.nodeName = nodeData.NodeName;
        this.tagName = nodeData.TagName;
        this.order = nodeData.Order;
        this.actions = nodeData.Actions;
        this.attributesCount = nodeData.AttributesCount;

        this.tagDisplayValue$ = new BehaviorSubject<string>(this.defaultNodeDisplayValue);

        this.attributeFactory = attributeFactory;
        this.validatiors = nodeValidators;
        this.rootNode = rootNode;
    }

    getRootNode(): QueryNode {
        if (this.nodeName === QueryNodeData.Fetch.NodeName) {
            return this;
        }

        return this.rootNode;
    }

    getParentEntity(node: QueryNode = this): QueryNode {
        if (node.nodeName === QueryNodeData.Fetch.NodeName) {
            return null;
        }

        const parent = node.parent;

        if (!parent) {
            return null; // Return null instead of throwing an error
        }

        if (parent?.nodeName === QueryNodeData.Entity.NodeName || parent?.nodeName === QueryNodeData.Link.NodeName) {
            return parent;
        } else {
            return this.getParentEntity(parent);
        }
    }

    getParentEntityName(parentEntityNode: QueryNode): BehaviorSubject<string> {
        if (!parentEntityNode) {
            return new BehaviorSubject<string>('');
        }

        const nameAttribute = parentEntityNode.attributes$.value.find(a => a.editorName === 'name');
        if (!nameAttribute) {
            return new BehaviorSubject<string>('');
        }

        return nameAttribute.value$;
    }

    setAttribute(attributeData: IAttributeData, value: string, atributeModel: AttributeModel = null): void {
        try {
            let attribute = this.findOrCreateAttribute(attributeData);

            if (attribute.value$.value !== value) {
                attribute.value$.next(value);
                if (atributeModel) {
                    attribute.setAttributeModel(atributeModel);
                }
            }
        } catch (error) {
            console.error(`[QueryNode] Error in setAttribute: ${error}`);
        }
    }

    private findOrCreateAttribute(attributeData: IAttributeData): NodeAttribute {
        let attribute = this.findAttribute(attributeData.EditorName);
        if (!attribute) {
            attribute = this.attributeFactory.createAttribute(attributeData.EditorName, this, false);
            this.addAttribute(attribute);
        }
        return attribute;
    }

    findAttribute(attributeName: string): NodeAttribute | undefined {
        const attribute = this.attributes$.value.find(a => a.editorName === attributeName);
        return attribute;
    }

    removeAttribute(attributeName: string): void {
        const attributes = this.attributes$.value;
        const index = attributes.findIndex(a => a.editorName === attributeName);
        
        if (index !== -1) {
            const attributeToRemove = attributes[index];
            attributeToRemove.dispose(); // Clean up subscriptions
            attributes.splice(index, 1);
            this.attributes$.next(attributes);
        }
    }

    getOrCreateAttribute(attributeName: string): NodeAttribute | undefined {
        return this.findAttribute(attributeName);
    }

    addAttribute(attribute: NodeAttribute): void {
        let attributes = this.attributes$.value;

        const isUndefinedAttribute = attribute.order > this.attributesCount;

        if (isUndefinedAttribute) {
            this.addToLastFreePosition(attribute, attributes);
        }
        else {
            attributes.splice(attribute.order - 1, 0, attribute);
        }

        attributes.sort((a, b) => a.order - b.order);

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

    public dispose(): void {
        this.attributes$.value.forEach(attribute => attribute.dispose());
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}