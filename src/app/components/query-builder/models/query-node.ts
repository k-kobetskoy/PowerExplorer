import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, Observable, switchMap, of } from "rxjs";
import { NodeAttribute } from "./node-attribute";
import { INodeData, QueryNodeData } from "./constants/query-node-data";
import { IAttributeData } from "./constants/attribute-data";
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

        const nodeData: INodeData = QueryNodeData[nodeName]
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
            map(attributes => attributes.map(attr => attr.attributeDisplayValues.treeViewDisplayValue$)),
            map(observables => combineLatest(observables)),
            map(observables$ => observables$.pipe(
                map(values => values.join(' ')),
                distinctUntilChanged()
            )),
            switchMap(observable => observable),
            debounceTime(200)
        );
    }

    validateNode(): Observable<boolean> {
        return this.attributes$.pipe(
            switchMap(attributes => 
                combineLatest(
                    attributes.map(attr => attr.getValidationState().pipe(
                        switchMap(result => combineLatest([
                            result.isValid$,
                            of(result.errorMessage)
                        ]))
                    ))
                ).pipe(
                    map(results => {
                        const errors = results
                            .filter(([isValid, error]) => !isValid)
                            .map(([_, error]) => error)
                            .filter(error => error != null);
                        
                        this.validationErrors$.next(errors);
                        return errors.length === 0;
                    })
                )
            )
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

    setAttribute(attributeData: IAttributeData, value: string): void {
        let attribute = this.findOrCreateAttribute(attributeData);
        attribute.value$.next(value);
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
        return this.attributes$.value.find(a => a.editorName === attributeName);
    }

    getOrCreateAttribute(attributeName: string): NodeAttribute | undefined {
        return this.findAttribute(attributeName);
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

    handleAttributeValidationChange(change: {attributeName: string, errors: string[]}) {
        const currentErrors = this.validationErrors$.value;
        const otherErrors = currentErrors.filter(err => !err.startsWith(`${change.attributeName}:`));
        const newErrors = change.errors.map(err => `${change.attributeName}: ${err}`);
        this.validationErrors$.next([...otherErrors, ...newErrors]);
    }
}

