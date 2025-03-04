import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, Observable, switchMap, of, tap } from "rxjs";
import { NodeAttribute } from "./node-attribute";
import { INodeData, QueryNodeData } from "./constants/query-node-data";
import {  IAttributeData } from "./constants/attribute-data";
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
    private readonly attributeFactory: IAttributeFactory;

    constructor(
        nodeName: string,
        private attributeFactoryResolver: AttributeFactoryResorlverService
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
        this.validationPassed$ = this.validateNode();
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
                    map(values => `${this.nodeName} ${values.join(' ')}`)
                );
            }),
            distinctUntilChanged(),
            debounceTime(150)
        );
    }

    validateNode(): Observable<boolean> {
        return this.attributes$.pipe(
            switchMap(attributes => {
                if (attributes.length === 0) {
                    return of(true);
                }
                
                return combineLatest(
                    attributes.map(attr => {
                        return attr.getValidationState().pipe(
                            switchMap(result => {
                                return result.isValid$.pipe(
                                    map(isValid => ({ isValid, errorMessage: result.errorMessage })),
                                );
                            })
                        );
                    })
                ).pipe(
                    map(results => {
                        try {
                            const errors = results
                                .filter(result => !result.isValid)
                                .map(result => result.errorMessage)
                                .filter(error => error != null && error !== '');
                            
                            console.log(`[QueryNode] Found ${errors.length} errors for node: ${this.nodeName}`);
                            this.validationErrors$.next(errors);
                            return errors.length === 0;
                        } catch (error) {
                            console.error(`[QueryNode] Error processing validation results for node: ${this.nodeName}`, error);
                            this.validationErrors$.next([`Error processing validation: ${error.message}`]);
                            return false;
                        }
                    })
                );
            })
        );
    }

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

    getParentEntityName(parentEntityNode: QueryNode): BehaviorSubject<string> {
        // Parent entity node is already provided, no need to look it up again
        if (!parentEntityNode) {
            console.warn('[QueryNode] getParentEntityName: Parent entity node is null');
            return new BehaviorSubject<string>('');
        }

        const nameAttribute = parentEntityNode.attributes$.value.find(a => a.editorName === 'name');
        if (!nameAttribute) {
            console.warn(`[QueryNode] getParentEntityName: 'name' attribute not found on entity node`, parentEntityNode);
            return new BehaviorSubject<string>('');
        }

        return nameAttribute.value$;
    }


    setAttribute(attributeData: IAttributeData, value: string | any): void {
        try {
            let attribute = this.findOrCreateAttribute(attributeData);
            
            // Handle objects with logicalName property
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

    handleAttributeValidationChange(change: {attributeName: string, errors: string[]}) {
        const currentErrors = this.validationErrors$.value;
        const otherErrors = currentErrors.filter(err => !err.startsWith(`${change.attributeName}:`));
        const newErrors = change.errors.map(err => `${change.attributeName}: ${err}`);
        this.validationErrors$.next([...otherErrors, ...newErrors]);
    }
}

