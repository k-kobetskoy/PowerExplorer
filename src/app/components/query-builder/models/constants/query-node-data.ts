import { AttributeNames } from "./attribute-names";

export interface INodeData
{
    Order: number,
    Actions: string[],
    Name: string,
    TagName: string,
    Attributes: string[],
    AttributesCount: number
}

export class QueryNodeData {
    static readonly Attribute: INodeData = {
        Order: 3,
        Actions: [],
        Name: 'Attribute',
        TagName: 'attribute',
        Attributes:
            [
                AttributeNames.orderAttribute,
                AttributeNames.orderDescending,
                AttributeNames.orderAlias
            ],
        AttributesCount: 3,
    };
    static readonly Condition: INodeData = {
        Order: 2,
        Actions: ['Value'],
        Name: 'Condition',
        TagName: 'condition',
        Attributes:
            [
                AttributeNames.conditionEntity,
                AttributeNames.conditionAttribute,
                AttributeNames.conditionOperator,
                AttributeNames.conditionValue,
                AttributeNames.conditionValueOf
            ],
        AttributesCount: 5,
    };
    static readonly Entity: INodeData = {
        Order: 1,
        Actions: ['Attribute', 'Filter', 'Order', 'Link'],
        Name: 'Entity',
        TagName: 'entity',
        Attributes:
            [
                AttributeNames.entityName,
                AttributeNames.entityAlias
            ],
        AttributesCount: 2,
    };
    static readonly Filter: INodeData = {
        Order: 6,
        Actions: ['Condition', 'Filter'],
        Name: 'Filter',
        TagName: 'filter',
        Attributes:
            [
                AttributeNames.filterType,
                AttributeNames.filterIsQuickFind,
                AttributeNames.filterOverrideRecordLimit,
                AttributeNames.filterBypassQuickFind
            ],
        AttributesCount: 4,
    };
    static readonly Link: INodeData = {
        Order: 5,
        Actions: ['Attribute', 'Filter', 'Order', 'Link'],
        Name: 'Link Entity',
        TagName: 'link-entity',
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
        AttributesCount: 8,
    };
    static readonly Order: INodeData = {
        Order: 2,
        Actions: [],
        Name: 'Order',
        TagName: 'order',
        Attributes:
            [
                AttributeNames.orderAttribute,
                AttributeNames.orderDescending,
                AttributeNames.orderAlias
            ],
        AttributesCount: 3,
    };
    static readonly Root: INodeData = {
        Order: 0,
        Actions: ['Entity'],
        Name: 'Root',
        TagName: 'fetch',
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
        AttributesCount: 10,
    };
    static readonly Value: INodeData = {
        Order: 2,
        Actions: [],
        Name: 'Value',
        TagName: 'value',
        Attributes: [],
        AttributesCount: 2,
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

    static readonly TagNames: string[] = [
        'value',
        'order',
        'attribute',
        'condition',
        'filter',
        'link-entity',
        'entity',
        'fetch'
    ];
}
