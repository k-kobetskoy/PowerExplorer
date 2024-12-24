// import { Injectable } from '@angular/core';
// import { NotImplementError } from 'src/app/models/errors/not-implement-error';
// import { QueryNodeType } from '../models/constants/query-node-type';
// import { ITagProperties } from '../models/abstract/i-tag-properties';


// @Injectable({ providedIn: 'root' })
// export class TagPropertiesFactoryService {

//   constructor() { }

//   getTagProperties(typeName: string): ITagProperties {
//     switch (typeName) {
//       case QueryNodeType.CONDITION:
//         return new TagPropertyCondition()
//       case QueryNodeType.ATTRIBUTE:
//         return new TagPropertyEntityAttribute()
//       case QueryNodeType.FILTER:
//         return new TagPropertyFilter()
//       case QueryNodeType.ENTITY:
//         return new TagPropertyEntity()
//       case QueryNodeType.LINK:
//         return new TagPropertyLink()
//       case QueryNodeType.ORDER:
//         return new TagPropertyOrder()
//       case QueryNodeType.VALUE:
//         return new TagPropertyConditionValue()
//       case QueryNodeType.ROOT:
//         return new TagPropertyRoot()
//       default:
//         throw new NotImplementError(`Couldn't find node type with the name: ${typeName}`)
//     }
//   }
// }
