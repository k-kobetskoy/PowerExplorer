// import { BehaviorSubject, Observable } from "rxjs";
// import { IPropertyDisplay } from "./i-node-property-display";
// import { EntityServiceFactoryService } from "../../services/entity-service-factory.service";
// import { NodeAttribute } from "../node-attribute";

// export interface IQueryNode {
//     defaultNodeDisplayValue: string;
//     attributes: NodeAttribute[];
//     order: number;
//     expandable: boolean;
//     name: string;
//     id?: string;
//     actions?: string[];
//     inputs?: string[];
//     level?: number;
//     isExpanded?: boolean;
//     next?: IQueryNode | null;
//     parent?: IQueryNode | null;
//     visible: boolean;
//     entitySetName$: BehaviorSubject<string>;
//     validationErrors$: BehaviorSubject<string[]>;
//     validationPassed$: Observable<boolean>;
//     entityServiceFactory: EntityServiceFactoryService;

//     get displayValue$(): Observable<IPropertyDisplay>;
//     getParentEntity(node: IQueryNode): IQueryNode;
//     getParentEntityName(node: IQueryNode): BehaviorSubject<string>
//     validateNode(): Observable<boolean>;
//     addAttribute(attribute: NodeAttribute): void;
//     sortAttributes(): void;
// }
