import { AttributeNames } from "./attribute-names";

export interface INodeData
{
    Order: number,
    Actions: string[],
    NodeName: string,
    TagName: string,
    Attributes: string[],
    AttributesCount: number
}

export class QueryNodeData {
    static readonly Attribute: INodeData = {
        Order: 3,
        Actions: [],
        NodeName: 'Attribute',
        TagName: 'attribute',
        Attributes:
            [
                AttributeNames.attributeName,
                AttributeNames.attributeAlias
            ],
        AttributesCount: 3,
    };
    static readonly Condition: INodeData = {
        Order: 2,
        Actions: ['Value'],
        NodeName: 'Condition',
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
        NodeName: 'Entity',
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
        Actions: ['Condition'],
        NodeName: 'Filter',
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
        NodeName: 'Link Entity',
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
        NodeName: 'Order',
        TagName: 'order',
        Attributes:
            [
                AttributeNames.orderAttribute,
                AttributeNames.orderDescending,
                AttributeNames.orderAlias
            ],
        AttributesCount: 3,
    };
    static readonly Fetch: INodeData = {
        Order: 0,
        Actions: ['Entity'],
        NodeName: 'Fetch',
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
        NodeName: 'Value',
        TagName: 'value',
        Attributes: [
            AttributeNames.valueInnerText
        ],
        AttributesCount: 1,
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

    static readonly TagNamesToNodeNames: { [key: string]: string } = {
        'value': QueryNodeData.Value.NodeName,
        'order': QueryNodeData.Order.NodeName,
        'attribute': QueryNodeData.Attribute.NodeName,
        'condition': QueryNodeData.Condition.NodeName,
        'filter': QueryNodeData.Filter.NodeName, 
        'link-entity': QueryNodeData.Link.NodeName,
        'entity': QueryNodeData.Entity.NodeName,
        'fetch': QueryNodeData.Fetch.NodeName
    };    

    static getNodeData(nodeName: string): INodeData {
        if (nodeName === 'Link Entity' || nodeName === 'Link') {
            return this.Link;
        }
        
        if (nodeName && this[nodeName]) {
            return this[nodeName];
        }
        
        console.warn(`Unknown node type: ${nodeName}, using default configuration`);
        return {
            Order: 99,
            Actions: [],
            NodeName: nodeName || 'Unknown',
            TagName: nodeName?.toLowerCase() || 'unknown',
            Attributes: [],
            AttributesCount: 1
        };
    }

    static getNodeAttributes(nodeName: string): string[] {
        const nodeData = this.getNodeData(nodeName);
        return nodeData.Attributes;
    }
}
