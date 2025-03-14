import { INodeValidators } from './../services/attribute-services/abstract/i-node-validators';
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { NodeAttribute } from "./node-attribute";
import { INodeData, QueryNodeData } from "./constants/query-node-data";
import { IAttributeData } from "./constants/attribute-data";
import { IAttributeFactory } from "../services/attribute-services/abstract/i-attribute-validators-factory";
import { NodeTreeService } from "../services/node-tree.service";
import { ValidationResult } from '../services/validation.service';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';

export class QueryNode {
    defaultNodeDisplayValue: string;
    order: number;
    attributes$: BehaviorSubject<NodeAttribute[]> = new BehaviorSubject<NodeAttribute[]>([]);
    attributesCount: number;
    expandable: boolean;
    nodeName: string;
    tagName: string;
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
    validationResult$: Observable<ValidationResult>;

    //TODO: implement this functionality later
    hasAggregateOrGroupByAttribute: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private readonly attributeFactory: IAttributeFactory;
    private nodeTreeService: NodeTreeService;

    destroyed$ = new Subject<void>();

    constructor(
        nodeData: INodeData,
        attributeFactory: IAttributeFactory,
        nodeValidators: INodeValidators
    ) {
        this.expandable = false;
        this.level = 0;
        this.visible = true;
        this.isExpanded = true;
        this.next = null;

        this.defaultNodeDisplayValue = nodeData.Name;
        this.nodeName = nodeData.Name;
        this.tagName = nodeData.TagName;
        this.order = nodeData.Order;
        this.actions = nodeData.Actions;
        this.attributesCount = nodeData.AttributesCount;

        this.tagDisplayValue$ = new BehaviorSubject<string>(this.defaultNodeDisplayValue);

        this.attributeFactory = attributeFactory;
        this.validatiors = nodeValidators;
    }

    public setNodeTreeService(nodeTreeService: NodeTreeService) {
        this.nodeTreeService = nodeTreeService;
    }

    getRootNode(): QueryNode {
        if (this.nodeName === QueryNodeData.Root.Name) {
            return this;
        }

        return this.nodeTreeService.getNodeTree().value.root;
    }

    getParentEntity(node: QueryNode = this): QueryNode {
        if (node.nodeName === QueryNodeData.Root.Name) {
            return null;
        }

        const parent = node.parent;

        if (!parent) {
            return null; // Return null instead of throwing an error
        }

        if (parent?.nodeName === QueryNodeData.Entity.Name || parent?.nodeName === QueryNodeData.Link.Name) {
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