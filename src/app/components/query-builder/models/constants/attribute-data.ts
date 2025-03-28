import { AttributeTreeViewDisplayStyle } from './attribute-tree-view-display-style';
import { AttributeType } from './dataverse/attribute-types';

export interface IAttributeData {
    Order?: number,
    EditorName: string,
    TreeViewName?: string,
    TreeViewDisplayStyle?: AttributeTreeViewDisplayStyle,
    IsValidName?: boolean,
    IgnoreFalseValues?: boolean
}

export class BaseAttributeData implements IAttributeData {
    Order?: number;
    TreeViewDisplayStyle: AttributeTreeViewDisplayStyle;
    IsValidName?: boolean;
    EditorName: string;
    TreeViewName?: string;
    IgnoreFalseValues?: boolean;
    constructor(
        ignoreFalseValues: boolean,
        editorName: string,
        treeViewDisplayStyle: AttributeTreeViewDisplayStyle = AttributeTreeViewDisplayStyle.none,
        order: number = 99,
        treeViewName?: string,
        isValidName?: boolean) {
        this.EditorName = editorName;
        this.TreeViewDisplayStyle = treeViewDisplayStyle;
        this.TreeViewName = treeViewName;
        this.Order = order;
        this.IsValidName = isValidName ??= true;
        this.IgnoreFalseValues = ignoreFalseValues;
    }
}

export interface IAttributeType {
    name: string;
}

export class EntityAttributeData {
    static readonly Name: IAttributeData =
        new BaseAttributeData(false,'name', AttributeTreeViewDisplayStyle.onlyValue, 1, 'Entity');

    static readonly Alias: IAttributeData =
        new BaseAttributeData(false,'alias', AttributeTreeViewDisplayStyle.alias, 2, 'Alias');
}

export class AttributeAttriubuteData {
    static readonly Name: IAttributeData =
        new BaseAttributeData(false, 'name', AttributeTreeViewDisplayStyle.onlyValue, 1, 'AttributeName');

    static readonly Alias: IAttributeData =
        new BaseAttributeData(false, 'alias', AttributeTreeViewDisplayStyle.alias, 2, 'Alias');

    static readonly Aggregate: IAttributeData =
        new BaseAttributeData(true,'aggregate', AttributeTreeViewDisplayStyle.nameWithValue, 3, 'Agg');

    static readonly GroupBy: IAttributeData =
        new BaseAttributeData(true, 'groupby', AttributeTreeViewDisplayStyle.onlyName, 4, 'GrpBy');

    static readonly Distinct: IAttributeData = new BaseAttributeData(true, 'distinct', AttributeTreeViewDisplayStyle.onlyName, 5, 'Dst');
    static readonly UserTimeZone: IAttributeData = new BaseAttributeData(true, 'usertimezone', AttributeTreeViewDisplayStyle.none, 6, '');
    static readonly DateGrouping: IAttributeData = new BaseAttributeData(true, 'dategrouping', AttributeTreeViewDisplayStyle.none, 7, '');
}

export class ConditionAttributeData {
    static readonly Entity: IAttributeData =
        new BaseAttributeData(false, 'entityname', AttributeTreeViewDisplayStyle.onlyValue, 1, 'Entity');

    static readonly Attribute: IAttributeData =
        new BaseAttributeData(false, 'attribute', AttributeTreeViewDisplayStyle.onlyValue, 2, 'Attribute');

    static readonly Operator: IAttributeData =
        new BaseAttributeData(false, 'operator', AttributeTreeViewDisplayStyle.onlyValue, 3, 'Operator');

    static readonly Value: IAttributeData =
        new BaseAttributeData(false, 'value', AttributeTreeViewDisplayStyle.onlyValue, 4, 'Value');

    static readonly ValueOf: IAttributeData =
        new BaseAttributeData(false, 'valueof', AttributeTreeViewDisplayStyle.onlyValue, 5, 'ValueOf');
}

export class FilterAttributeData {
    static readonly Type: IAttributeData =
        new BaseAttributeData(true,'type', AttributeTreeViewDisplayStyle.onlyValue, 1, 'FilterType');

    static readonly IsQuickFind: IAttributeData = new BaseAttributeData(true,'isquickfindfields', AttributeTreeViewDisplayStyle.none, 2, '');
    static readonly OverrideRecordLimit: IAttributeData = new BaseAttributeData(true,'overridequickfindrecordlimitenabled', AttributeTreeViewDisplayStyle.none, 3, '');
    static readonly BypassQuickFind: IAttributeData = new BaseAttributeData(true,'overridequickfindrecordlimitdisabled', AttributeTreeViewDisplayStyle.none, 4, '');
}

export class LinkAttributeData {
    static readonly Entity: IAttributeData =
        new BaseAttributeData(false,'name', AttributeTreeViewDisplayStyle.onlyValue, 1, 'LinkEntity');

    static readonly Alias: IAttributeData =
        new BaseAttributeData(false,'alias', AttributeTreeViewDisplayStyle.alias, 8, 'LinkAlias');

    static readonly Intersect: IAttributeData =
        new BaseAttributeData(true, 'intersect', AttributeTreeViewDisplayStyle.onlyName, 5, 'M:M');

    static readonly Type: IAttributeData =
        new BaseAttributeData(true, 'link-type', AttributeTreeViewDisplayStyle.onlyValue, 4, 'LinkType');

    static readonly From: IAttributeData = new BaseAttributeData(false,'from', AttributeTreeViewDisplayStyle.none, 2, '');
    static readonly To: IAttributeData = new BaseAttributeData(false,'to', AttributeTreeViewDisplayStyle.none, 3, '');
    static readonly Visible: IAttributeData = new BaseAttributeData(true, 'visible', AttributeTreeViewDisplayStyle.none, 7, '');
    static readonly FetchAllEntities: IAttributeData = new BaseAttributeData(true, 'fetchallentities', AttributeTreeViewDisplayStyle.none, 6, '');
}

export class OrderAttributeData {
    static readonly Attribute: IAttributeData =
        new BaseAttributeData(false,'attribute', AttributeTreeViewDisplayStyle.onlyValue, 1, 'OrderAttribute');

    static readonly Alias: IAttributeData =
        new BaseAttributeData(false,'alias', AttributeTreeViewDisplayStyle.alias, 2, 'OrderAlias');

    static readonly Desc: IAttributeData =
        new BaseAttributeData(true,'descending', AttributeTreeViewDisplayStyle.onlyName, 3, 'Desc');
}

export class FetchAttributeData {
    static readonly Top: IAttributeData =
        new BaseAttributeData(true,'top', AttributeTreeViewDisplayStyle.nameWithValue, 1, 'Top');

    static readonly Distinct: IAttributeData =
        new BaseAttributeData(true,'distinct', AttributeTreeViewDisplayStyle.onlyName, 5, 'Dst');

    static readonly Aggregate: IAttributeData =
        new BaseAttributeData(true,'aggregate', AttributeTreeViewDisplayStyle.onlyName, 4, 'Agg');

    static readonly TotalRecordsCount: IAttributeData =
        new BaseAttributeData(true,'returntotalrecordcount', AttributeTreeViewDisplayStyle.onlyName, 3, 'Trc');

    static readonly RecordsPerPage: IAttributeData =
        new BaseAttributeData(true,'count', AttributeTreeViewDisplayStyle.nameWithValue, 2, 'Cnt');

    static readonly Page: IAttributeData =
        new BaseAttributeData(true,'page', AttributeTreeViewDisplayStyle.nameWithValue, 6, 'Pg');

    static readonly LateMaterialize: IAttributeData = 
        new BaseAttributeData(true,'latematerialize', AttributeTreeViewDisplayStyle.none, 7, '');
    
    static readonly PagingCookie: IAttributeData = new BaseAttributeData(true,'paging-cookie', AttributeTreeViewDisplayStyle.none, 8, '');
    static readonly DataSource: IAttributeData = new BaseAttributeData(true,'datasource', AttributeTreeViewDisplayStyle.none, 9, '');
    static readonly Options: IAttributeData = new BaseAttributeData(true,'options', AttributeTreeViewDisplayStyle.none, 10, '');
}

export class ValueAttributeData {
    static readonly InnerText: IAttributeData =
        new BaseAttributeData(false,'valuenodeinnertext', AttributeTreeViewDisplayStyle.onlyValue, 1, 'Value Content');
}

export class AttributeData {

    static readonly Entity: typeof EntityAttributeData = EntityAttributeData;

    static readonly Attribute: typeof AttributeAttriubuteData = AttributeAttriubuteData;

    static readonly Condition: typeof ConditionAttributeData = ConditionAttributeData;

    static readonly Filter: typeof FilterAttributeData = FilterAttributeData;

    static readonly Link: typeof LinkAttributeData = LinkAttributeData;

    static readonly Order: typeof OrderAttributeData = OrderAttributeData;

    static readonly Root: typeof FetchAttributeData = FetchAttributeData;
    
    static readonly Value: typeof ValueAttributeData = ValueAttributeData;

    static readonly NodesNames: string[] = [
        'Value',
        'Order',
        'Attribute',
        'Condition',
        'Filter',
        'Link Entity',
        'Entity',
        'Fetch'
    ];

    static readonly AggregateFuncNames: string[] =[
        'avg',
        'count',
        'countcolumn',
        'max',
        'min',
        'sum'
    ]

    static readonly DateGroupingNames: string[] =[
        'day',
        'fiscal-period',
        'fiscal-year',
        'month',
        'quarter',
        'week',
        'year'
    ]
}
