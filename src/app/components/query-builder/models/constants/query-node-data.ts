import { AttributeNames } from "./attribute-names";

export interface INodeData { Order: number, Actions: string[], Name: string, Attributes: string[], AttributesArrayCapacity: number };

export class QueryNodeData {
    static readonly Attribute: INodeData = {
        Order: 3,
        Actions: [],
        Name: 'Attribute',
        Attributes:
            [
                AttributeNames.orderAttribute,
                AttributeNames.orderDescending,
                AttributeNames.orderAlias
            ],
        AttributesArrayCapacity: 5,
    };
    static readonly Condition: INodeData = {
        Order: 2,
        Actions: ['Value'],
        Name: 'Condition',
        Attributes:
            [
                AttributeNames.conditionEntity,
                AttributeNames.conditionAttribute,
                AttributeNames.conditionOperator,
                AttributeNames.conditionValue,
                AttributeNames.conditionValueOf
            ],
        AttributesArrayCapacity: 7,
    };
    static readonly Entity: INodeData = {
        Order: 1,
        Actions: ['Attribute', 'Filter', 'Order', 'Link'],
        Name: 'Entity',
        Attributes:
            [
                AttributeNames.entityName,
                AttributeNames.entityAlias
            ],
        AttributesArrayCapacity: 4,
    };
    static readonly Filter: INodeData = {
        Order: 6,
        Actions: ['Condition', 'Filter'],
        Name: 'Filter',
        Attributes:
            [
                AttributeNames.filterType,
                AttributeNames.filterIsQuickFind,
                AttributeNames.filterOverrideRecordLimit,
                AttributeNames.filterBypassQuickFind
            ],
        AttributesArrayCapacity: 6,
    };
    static readonly Link: INodeData = {
        Order: 5,
        Actions: ['Attribute', 'Filter', 'Order', 'Link'],
        Name: 'Link Entity',
        Attributes:
            [
                AttributeNames.linkEntity,
                AttributeNames.linkFromAttribute,
                AttributeNames.linkToAttribute,
                AttributeNames.linkType,
                AttributeNames.linkAlias,
                AttributeNames.linkIntersect,
                AttributeNames.linkVisible,
                AttributeNames.linkShowOnlyLoolups
            ],
        AttributesArrayCapacity: 10,
    };
    static readonly Order: INodeData = {
        Order: 2,
        Actions: [],
        Name: 'Order',
        Attributes:
            [
                AttributeNames.orderAttribute,
                AttributeNames.orderDescending,
                AttributeNames.orderAlias
            ],
        AttributesArrayCapacity: 5,
    };
    static readonly Root: INodeData = {
        Order: 0,
        Actions: ['Entity'],
        Name: 'Root',
        Attributes:
            [
                AttributeNames.rootTop,
                AttributeNames.rootDistinct,
                AttributeNames.rootAggregate,
                AttributeNames.rootTotalRecordsCount,
                AttributeNames.rootLateMaterialize,
                AttributeNames.rootRecordsPerPage,
                AttributeNames.rootPage,
                AttributeNames.rootPagingCookie,
                AttributeNames.rootDataSource,
                AttributeNames.rootOptions
            ],
        AttributesArrayCapacity: 12,
    };
    static readonly Value: INodeData = {
        Order: 2,
        Actions: [],
        Name: 'Value',
        Attributes: [],
        AttributesArrayCapacity: 2,
    };
    static readonly NodesNames: string[] = [
        'Value',
        'Order',
        'Attribute',
        'Condition',
        'Filter',
        'Link Entity',
        'Entity',
        'Root'
    ];
}