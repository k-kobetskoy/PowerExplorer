import { Injectable } from '@angular/core';
import { NodeFactoryService } from '../attribute-services/node-factory.service';
import { IAttributeFactory } from '../attribute-services/abstract/i-attribute-validators-factory';
import { QueryNode } from '../../models/query-node';
import { QueryNodeData } from '../../models/constants/query-node-data';

export interface IQueryNodeBuildResult {
  isBuildSuccess: boolean;
  nodeName: string;
  attributes: ITagBuildEntityAttribute[];
  errors: IBuildQueryError[];
}

export interface ITagBuildEntityAttribute {
  name: string;
  value?: string;
  nameFrom: number;
  nameTo: number;
  valueFrom?: number;
  valueTo?: number;
}

export interface IBuildQueryError {
  message: string;
  from?: number;
  to?: number;
}

export interface ITagBuildEntity {
  tagName: string;
  isExpanded: boolean;
  nodeLevel: number;
  from: number;
  to: number;
}

export const UNEXPECTED_ERROR_TEXT = 'Unexpected error. Please check you XML';

@Injectable({ providedIn: 'root' })
export class QueryNodeBuilderService {
  constructor(private attributeFactoryResolver: NodeFactoryService) { }

  tag: ITagBuildEntity;
  attribute: ITagBuildEntityAttribute;
  attributes: ITagBuildEntityAttribute[] = [];
  errors: IBuildQueryError[] = [];

  createQueryNode(tagName: string, isExpanded: boolean, nodeLevel: number) {
    this.resetNodeData();
    this.tag = { tagName: tagName, isExpanded: isExpanded, nodeLevel: nodeLevel, from: 0, to: 0 };
  }

  setAttributeName(attributeName: string, from: number, to: number) {
    this.attribute = { name: attributeName.toLowerCase(), nameFrom: from, nameTo: to };
  }

  setAttributeValue(attributeValue: string, from: number, to: number) {
    if (!this.attribute) {
      return;
    }

    this.attribute.value = attributeValue;
    this.attribute.valueFrom = from;
    this.attribute.valueTo = to;

    this.attributes.push(this.attribute);
    this.attribute = null;
  }

  buildQueryNode(): IQueryNodeBuildResult {
    const isTagNameValid = this.validateTagName(this.tag, this.errors)
    
    const queryNodeName = isTagNameValid ? QueryNodeData.TagNamesToNodeNames[this.tag.tagName] : this.tag.tagName;

    return {
      isBuildSuccess: this.errors.length === 0,
      nodeName: queryNodeName,
      attributes: this.attributes,
      errors: this.errors
    };
  }

  addAttributeValueToNode(attribute: ITagBuildEntityAttribute, queryNode: QueryNode, attributeFactory: IAttributeFactory) {
    let nodeAttribute = attributeFactory.createAttribute(attribute.name, queryNode, true, attribute.value);

    queryNode.addAttribute(nodeAttribute);
  }

  resetNodeData() {
    this.tag = null;
    this.attribute = null;
    this.attributes = [];
    this.errors = [];
  }

  validateTagName(tag: ITagBuildEntity, errors: IBuildQueryError[]): boolean {
    if (!tag) {
      errors.push({ message: UNEXPECTED_ERROR_TEXT });
      return false;
    }

    if (!tag.tagName) {
      errors.push({ message: this.getTagNameErrorMessage(tag.tagName), from: tag.from, to: tag.to });
      return false;
    }

    if (!this.isValidQueryNodeType(tag.tagName)) {
      errors.push({ message: this.getTagNameErrorMessage(tag.tagName), from: tag.from, to: tag.to });
      return false;
    }

    return true;
  }

  private isValidQueryNodeType(tagName: string): boolean {
    return QueryNodeData.TagNames.includes(tagName);
  }

  private getTagNameErrorMessage(tagName: string): string {
    return `Tag name '${tagName}' is not valid`;
  }
}