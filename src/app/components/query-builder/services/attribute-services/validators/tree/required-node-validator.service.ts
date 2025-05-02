import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of } from 'rxjs';
import { QueryNodeTree } from 'src/app/components/query-builder/models/query-node-tree';
import { ValidationResult } from '../../../validation.service';
import { QueryNodeData } from 'src/app/components/query-builder/models/constants/query-node-data';

export interface INodeTreeValidator {
  validate(nodeTree: BehaviorSubject<QueryNodeTree>): Observable<ValidationResult>;
}

@Injectable({  providedIn: 'root'})
export class RequiredNodeValidatorService implements INodeTreeValidator {

constructor() { }

  validate(nodeTree: BehaviorSubject<QueryNodeTree>): Observable<ValidationResult> {
  return nodeTree.pipe(
    map(nodeTree => {
      const rootNode = nodeTree.root;
      if (!rootNode) {
        return { isValid: false, errors: ['Root node is required'] } as ValidationResult;
      }

      if (rootNode.nodeName !== QueryNodeData.Fetch.NodeName) {
        return { isValid: false, errors: ['Root node is required'] } as ValidationResult;
      }

      const entityNode = rootNode.next;

      if (!entityNode) {
        return { isValid: false, errors: ['Entity node is required'] } as ValidationResult;
      }

      if (entityNode.nodeName !== QueryNodeData.Entity.NodeName) {
        return { isValid: false, errors: ['Entity node is required'] } as ValidationResult;
      }    

      return { isValid: true, errors: [] } as ValidationResult;
    })
  );
}

}
