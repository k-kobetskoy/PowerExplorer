export const AttributeValidationTypes = {
    alias: 'alias',
    typeBoolean: 'bool',
    typeNumber: 'number',
    typeString: 'string',
    serverEntity: 'Entity',
    serverParentEntityAttribute: 'parentEntityAttribute',
    serverValueOfAttribute: 'serverValueOfAttribute',
    serverLinkEntityAttribute: 'serverLinkEntityAttribute',
    serverBoolean: 'Boolean',
    serverPicklist: 'picklist',
    attributeAggregateList: 'attributeAggregateList',
    attributeDateGrouping: 'attributeDateGrouping',
    attributeFetchAggregateTure: 'attributeFetchAggregateTure',
    attributeDistinctFalse: 'attributeDistinctFalse',
    attributeGroupByFalse: 'attributeGroupByFalse',
    attributeGroupByTrue: 'attributeGroupByTrue',
    conditionValueList: 'conditionValueList',
    conditionValueAttributeNameNotNull: 'conditionValueAttributeNameNotNull',
    conditionValueTypes: 'conditionValueTypes',
    listFilterType: 'listFilterType',
    listLinkType: 'listLinkType',
    orderFetchAggregateFalse: 'orderFetchAggregateFalse',
    attributeNameRequired: 'attributeNameRequired',
} as const;
export type AttributeValidationTypes = (typeof AttributeValidationTypes)[keyof typeof AttributeValidationTypes];
