// import { Injectable } from '@angular/core';
// import { QueryNodeType } from 'src/app/components/query-builder/models/constants/query-node-type';
// import { NotImplementError } from 'src/app/models/errors/not-implement-error';
// import { IQueryNode } from 'src/app/components/query-builder/models/abstract/i-query-node';
// import { EntityServiceFactoryService } from './entity-service-factory.service';
// import { QueryNode } from '../models/query-node';

// @Injectable({ providedIn: 'root' })
// export class NodeFactoryService {

//   constructor(private entityServiceFactory: EntityServiceFactoryService) { }

//   createNode(nodeName: string): QueryNode {
//     switch (nodeName) {
//       case QueryNodeType.CONDITION:
//         return new QueryNode()
//       case QueryNodeType.ATTRIBUTE:
//         return new QueryNode()
//       case QueryNodeType.FILTER:
//         return new QueryNode(this.entityServiceFactory)
//       case QueryNodeType.ENTITY:
//         return new QueryNode( this.entityServiceFactory)
//       case QueryNodeType.LINK:
//         return new QueryNode(this.entityServiceFactory)
//       case QueryNodeType.ORDER:
//         return new QueryNode( this.entityServiceFactory)
//       case QueryNodeType.VALUE:
//         return new QueryNode(this.entityServiceFactory)
//       case QueryNodeType.ROOT:
//         return new QueryNode( this.entityServiceFactory)
//       default:
//         throw new NotImplementError(`Couldn't find node type with the name: ${nodeName}`)
//     }
//   }
// }
