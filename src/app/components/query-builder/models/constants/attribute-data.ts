import { AttributeTreeViewDisplayStyle } from './attribute-tree-view-display-style';

export interface IAttributeData {
    Order?: number,
    EditorName: string,
    TreeViewName?: string,
    TreeViewDisplayStyle?: AttributeTreeViewDisplayStyle,
    IsValidName?: boolean
}

export class BaseAttributeData implements IAttributeData {
    Order?: number;
    TreeViewDisplayStyle: AttributeTreeViewDisplayStyle;
    IsValidName?: boolean;
    EditorName: string;
    TreeViewName?: string;

    constructor(
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
    }
}

export class EntityAttributeData {
    static readonly Name: IAttributeData =
        new BaseAttributeData('name', AttributeTreeViewDisplayStyle.onlyValue, 1, 'Entity');

    static readonly Alias: IAttributeData =
        new BaseAttributeData('alias', AttributeTreeViewDisplayStyle.alias, 2, 'Alias');
}

export class AttributeAttriubuteData {
    static readonly Name: IAttributeData =
        new BaseAttributeData('name', AttributeTreeViewDisplayStyle.onlyValue, 1, 'AttributeName');

    static readonly Alias: IAttributeData =
        new BaseAttributeData('alias', AttributeTreeViewDisplayStyle.alias, 2, 'Alias');

    static readonly Aggregate: IAttributeData =
        new BaseAttributeData('aggregate', AttributeTreeViewDisplayStyle.nameWithValue, 3, 'Agg');

    static readonly GroupBy: IAttributeData =
        new BaseAttributeData('groupby', AttributeTreeViewDisplayStyle.onlyName, 4, 'GrpBy');

    static readonly Distinct: IAttributeData = new BaseAttributeData('distinct', AttributeTreeViewDisplayStyle.onlyName, 5, 'Dst');
    static readonly UserTimeZone: IAttributeData = new BaseAttributeData('usertimezone', AttributeTreeViewDisplayStyle.none, 6, '');
    static readonly DateGrouping: IAttributeData = new BaseAttributeData('dategrouping', AttributeTreeViewDisplayStyle.none, 7, '');
}

export class ConditionAttributeData {
    static readonly Entity: IAttributeData =
        new BaseAttributeData('entityname', AttributeTreeViewDisplayStyle.onlyValue, 1, 'Entity');

    static readonly Attribute: IAttributeData =
        new BaseAttributeData('attribute', AttributeTreeViewDisplayStyle.onlyValue, 2, 'Attribute');

    static readonly Operator: IAttributeData =
        new BaseAttributeData('operator', AttributeTreeViewDisplayStyle.onlyValue, 3, 'Operator');

    static readonly Value: IAttributeData =
        new BaseAttributeData('value', AttributeTreeViewDisplayStyle.onlyValue, 4, 'Value');

    static readonly ValueOf: IAttributeData =
        new BaseAttributeData('valueof', AttributeTreeViewDisplayStyle.onlyValue, 5, 'ValueOf');
}

export class FilterAttributeData {
    static readonly Type: IAttributeData =
        new BaseAttributeData('type', AttributeTreeViewDisplayStyle.onlyValue, 1, 'FilterType');

    static readonly IsQuickFind: IAttributeData = new BaseAttributeData('isquickfindfields', AttributeTreeViewDisplayStyle.none, 2, '');
    static readonly OverrideRecordLimit: IAttributeData = new BaseAttributeData('overridequickfindrecordlimitenabled', AttributeTreeViewDisplayStyle.none, 3, '');
    static readonly BypassQuickFind: IAttributeData = new BaseAttributeData('overridequickfindrecordlimitdisabled', AttributeTreeViewDisplayStyle.none, 4, '');
}

export class LinkAttributeData {
    static readonly Entity: IAttributeData =
        new BaseAttributeData('name', AttributeTreeViewDisplayStyle.onlyValue, 1, 'LinkEntity');

    static readonly Alias: IAttributeData =
        new BaseAttributeData('alias', AttributeTreeViewDisplayStyle.alias, 2, 'LinkAlias');

    static readonly Intersect: IAttributeData =
        new BaseAttributeData('intersect', AttributeTreeViewDisplayStyle.onlyName, 4, 'M:M');

    static readonly Type: IAttributeData =
        new BaseAttributeData('link-type', AttributeTreeViewDisplayStyle.onlyValue, 3, 'LinkType');

    static readonly From: IAttributeData = new BaseAttributeData('from', AttributeTreeViewDisplayStyle.none, 5, '');
    static readonly To: IAttributeData = new BaseAttributeData('to', AttributeTreeViewDisplayStyle.none, 6, '');
    static readonly Visible: IAttributeData = new BaseAttributeData('visible', AttributeTreeViewDisplayStyle.none, 7, '');
    static readonly ShowOnlyLookups: IAttributeData = new BaseAttributeData('showonlylookups', AttributeTreeViewDisplayStyle.none, 8, '');
}

export class OrderAttributeData {
    static readonly Attribute: IAttributeData =
        new BaseAttributeData('attribute', AttributeTreeViewDisplayStyle.onlyValue, 1, 'OrderAttribute');

    static readonly Alias: IAttributeData =
        new BaseAttributeData('alias', AttributeTreeViewDisplayStyle.alias, 2, 'OrderAlias');

    static readonly Desc: IAttributeData =
        new BaseAttributeData('descending', AttributeTreeViewDisplayStyle.onlyName, 3, 'Desc');
}

export class RootAttributeData {
    static readonly Top: IAttributeData =
        new BaseAttributeData('top', AttributeTreeViewDisplayStyle.nameWithValue, 1, 'Top');

    static readonly Distinct: IAttributeData =
        new BaseAttributeData('distinct', AttributeTreeViewDisplayStyle.onlyName, 5, 'Dst');

    static readonly Aggregate: IAttributeData =
        new BaseAttributeData('aggregate', AttributeTreeViewDisplayStyle.onlyName, 4, 'Agg');

    static readonly TotalRecordsCount: IAttributeData =
        new BaseAttributeData('returntotalrecordcount', AttributeTreeViewDisplayStyle.onlyName, 3, 'Trc');

    static readonly RecordsPerPage: IAttributeData =
        new BaseAttributeData('count', AttributeTreeViewDisplayStyle.nameWithValue, 2, 'Cnt');

    static readonly Page: IAttributeData =
        new BaseAttributeData('page', AttributeTreeViewDisplayStyle.nameWithValue, 6, 'Pg');

    static readonly LateMaterialize: IAttributeData = 
        new BaseAttributeData('latematerialize', AttributeTreeViewDisplayStyle.none, 7, '');
    
    static readonly PagingCookie: IAttributeData = new BaseAttributeData('paging-cookie', AttributeTreeViewDisplayStyle.none, 8, '');
    static readonly DataSource: IAttributeData = new BaseAttributeData('datasource', AttributeTreeViewDisplayStyle.none, 9, '');
    static readonly Options: IAttributeData = new BaseAttributeData('options', AttributeTreeViewDisplayStyle.none, 10, '');
}


export class AttributeData {

    static readonly Entity: typeof EntityAttributeData = EntityAttributeData;

    static readonly Attribute: typeof AttributeAttriubuteData = AttributeAttriubuteData;

    static readonly Condition: typeof ConditionAttributeData = ConditionAttributeData;

    static readonly Filter: typeof FilterAttributeData = FilterAttributeData;

    static readonly Link: typeof LinkAttributeData = LinkAttributeData;

    static readonly Order: typeof OrderAttributeData = OrderAttributeData;

    static readonly Root: typeof RootAttributeData = RootAttributeData;

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
