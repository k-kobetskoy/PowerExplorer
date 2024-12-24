// import { ITagProperties } from "../abstract/i-tag-properties";
// import { QueryNodeTags } from "../constants/query-node-tags";
// import { AttributeNames } from "../constants/attribute-names";
// import { AttributeValueTypes } from "../constants/attribute-value-types";
// import { TagProperty } from "../tag-property";

// export class TagPropertyRoot implements ITagProperties {

//     readonly tagName: string = QueryNodeTags.ROOT;

//     rootTop?: TagProperty<number>;
//     rootDistinct?: TagProperty<boolean>;
//     rootAggregate?: TagProperty<boolean>;
//     rootTotalRecordsCount?: TagProperty<boolean>;
//     rootLateMaterialize?: TagProperty<boolean>;
//     rootPageSize?: TagProperty<number>;
//     rootPage?: TagProperty<number>;
//     rootPagingCookie?: TagProperty<string>;
//     rootDataSource?: TagProperty<string>;
//     rootOptions?: TagProperty<string>;
//     default: { key: string; value: string; }[] = [];

//     validProperties: { [key: string]: TagProperty<string | boolean | number> };

//     constructor(){
//         this.rootTop = new TagProperty<number>(AttributeNames.rootTop, AttributeValueTypes.number, 'Top');
//         this.rootDistinct = new TagProperty<boolean>(AttributeNames.rootDistinct, AttributeValueTypes.boolean, 'Dst', false);
//         this.rootAggregate = new TagProperty<boolean>(AttributeNames.rootAggregate, AttributeValueTypes.boolean, 'Agg', false);
//         this.rootTotalRecordsCount = new TagProperty<boolean>(AttributeNames.rootTotalRecordsCount, AttributeValueTypes.boolean, 'Trc', false);
//         this.rootLateMaterialize = new TagProperty<boolean>(AttributeNames.rootLateMaterialize, AttributeValueTypes.boolean, '', false);
//         this.rootPageSize = new TagProperty<number>(AttributeNames.rootRecordsPerPage, AttributeValueTypes.number, 'PgSz');
//         this.rootPage = new TagProperty<number>(AttributeNames.rootPage, AttributeValueTypes.number, 'Pg');
//         this.rootPagingCookie = new TagProperty<string>(AttributeNames.rootPagingCookie, AttributeValueTypes.string);
//         this.rootDataSource = new TagProperty<string>(AttributeNames.rootDataSource, AttributeValueTypes.string);
//         this.rootOptions = new TagProperty<string>(AttributeNames.rootOptions, AttributeValueTypes.string);

//         this.validProperties = {
//             [AttributeNames.rootTop]: this.rootTop,
//             [AttributeNames.rootDistinct]: this.rootDistinct,
//             [AttributeNames.rootAggregate]: this.rootAggregate,
//             [AttributeNames.rootTotalRecordsCount]: this.rootTotalRecordsCount,
//             [AttributeNames.rootLateMaterialize]: this.rootLateMaterialize,
//             [AttributeNames.rootRecordsPerPage]: this.rootPageSize,
//             [AttributeNames.rootPage]: this.rootPage,
//             [AttributeNames.rootPagingCookie]: this.rootPagingCookie,
//             [AttributeNames.rootDataSource]: this.rootDataSource,
//             [AttributeNames.rootOptions]: this.rootOptions
//         };
//     }

//     validateTagPropertyName(propertyName: string): boolean {
//         return this.validProperties.hasOwnProperty(propertyName);
//     };

//     getTagPropertyByName(propertyName: string): TagProperty<string | boolean | number> | undefined {
//         return this.validProperties[propertyName];
//     }
// }
