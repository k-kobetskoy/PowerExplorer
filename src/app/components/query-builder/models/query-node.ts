import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, Observable, switchMap, of, tap, Subscription, Subject, takeUntil, take, catchError, shareReplay } from "rxjs";
import { NodeAttribute } from "./node-attribute";
import { INodeData, QueryNodeData } from "./constants/query-node-data";
import {  IAttributeData } from "./constants/attribute-data";
import { AttributeFactoryResorlverService } from "../services/attribute-services/attribute-factory-resorlver.service";
import { IAttributeFactory } from "../services/attribute-services/abstract/i-attribute-validators-factory";
import { NodeTreeService } from "../services/node-tree.service";
import { ValidationService, ValidationResult } from '../services/validation.service';

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
    entitySetName$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    relationship$?: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    showOnlyLookups$?: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    tagDisplayValue$: Observable<string>;
    nodeDisplayValue$: Observable<string>;
    validationResult$: Observable<ValidationResult>;

    private readonly attributeFactory: IAttributeFactory;
    private static nodeTreeService: NodeTreeService;
    
    private destroyed$ = new Subject<void>();

    constructor(
        nodeName: string,
        private attributeFactoryResolver: AttributeFactoryResorlverService,
        private validationService: ValidationService
    ) {
        this.expandable = false;
        this.level = 0;
        this.visible = true;
        this.isExpanded = true;
        this.next = null;

        const nodeData: INodeData = QueryNodeData.getNodeData(nodeName);
        
        this.defaultNodeDisplayValue = nodeData.Name;
        this.nodeName = nodeData.Name;
        this.tagName = nodeData.TagName;
        this.order = nodeData.Order;
        this.actions = nodeData.Actions;
        this.attributesCount = nodeData.AttributesCount;
        this.attributes$ = new BehaviorSubject<NodeAttribute[]>([]);

        this.tagDisplayValue$ = new BehaviorSubject<string>(this.defaultNodeDisplayValue);
        this.nodeDisplayValue$ = this.createNodeDisplayValueObservable();

        this.attributeFactory = this.attributeFactoryResolver.getAttributesFactory(nodeName);
            
        if (this.nodeName === QueryNodeData.Entity.Name) {
            this.setupEntitySetNameSubscription();
        }

        this.validationResult$ = this.validationService.validateNode(this, this.destroyed$);
    }

    public static setNodeTreeService(nodeTreeService: NodeTreeService) {
        QueryNode.nodeTreeService = nodeTreeService;
    }

    public dispose(): void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    private setupEntitySetNameSubscription() {
        if (!QueryNode.nodeTreeService) {
            return;
        }

        if (this.entitySetName$.value) {
            QueryNode.nodeTreeService.isExecutable$.next(true);
        }

        this.entitySetName$.pipe(
            distinctUntilChanged(),
            takeUntil(this.destroyed$) 
        ).subscribe(entitySetName => {
            if (QueryNode.nodeTreeService) {
                QueryNode.nodeTreeService.isExecutable$.next(!!entitySetName);
            }
        });
    }

    private createNodeDisplayValueObservable(): Observable<string> {
        return this.attributes$.pipe(
            switchMap(attributes => {
                if (attributes.length === 0) {
                    return of(this.nodeName);
                }
                
                // Only include attributes that should be displayed on the tree view
                const displayableAttributes = attributes.filter(attr => 
                    attr.attributeDisplayValues.displayOnTreeView
                );
                
                if (displayableAttributes.length === 0) {
                    return of(this.nodeName);
                }
                
                const displayValues$ = displayableAttributes.map(attr => 
                    attr.attributeDisplayValues.treeViewDisplayValue$
                );
                
                return combineLatest(displayValues$).pipe(
                    map(values => `${this.nodeName} ${values.join(' ')}`),
                    takeUntil(this.destroyed$) 
                );
            }),
            distinctUntilChanged(),
            takeUntil(this.destroyed$),
            shareReplay(1)
        );
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


    setAttribute(attributeData: IAttributeData, value: string | any): void {
        try {
            let attribute = this.findOrCreateAttribute(attributeData);
            
            if (typeof value === 'object' && value && 'logicalName' in value) {
                attribute.value$.next(value.logicalName);
            } else {
                attribute.value$.next(value);
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
}