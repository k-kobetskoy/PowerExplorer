import { ParsingHelperService } from './parsing-helper.service';
import { Injectable } from '@angular/core';
import { SyntaxNodeRef } from '@lezer/common';
import { Diagnostic } from "@codemirror/lint";
import { QueryNodeTree } from '../../models/query-node-tree';
import { EditorView } from 'codemirror';
import { QueryNodeBuilderService } from './query-node-builder.service';

export const PARSER_NODE_NAMES = {
  openTag: 'OpenTag',
  closeTag: 'CloseTag',
  startTag: 'StartTag',
  startCloseNode: 'StartCloseTag',
  tagName: 'TagName',
  endTag: 'EndTag',
  attributeName: 'AttributeName',
  attributeValue: 'AttributeValue',
  text: 'Text',
  selfClosingTag: 'SelfClosingTag',
  selfClosingEndNode: 'SelfCloseEndTag',
  element: 'Element',
  mismatchedCloseNode: 'MismatchedCloseTag',
  unexpectedParsingError: '⚠'
};

@Injectable({ providedIn: 'root' })
export class XmlParseService {

  nodeTree = new QueryNodeTree();
  isExpanded: boolean = false;
  nodeLevel: number = -1;
  from: number;
  to: number;

  constructor(private parsingHelper: ParsingHelperService, private nodeBuilder: QueryNodeBuilderService) { }

  parseNode(iteratingNode: SyntaxNodeRef, view: EditorView, xmlParseErrors: Diagnostic[]) {
    console.log(iteratingNode.name);
    if (iteratingNode.name === PARSER_NODE_NAMES.element) {
      console.log(iteratingNode.from, iteratingNode.to);
    }

    switch (iteratingNode.name) {
      case PARSER_NODE_NAMES.openTag:
        this.isExpanded = true;
        this.nodeLevel++;
        break;
      case PARSER_NODE_NAMES.selfClosingTag:
        this.isExpanded = false;
        break;
      case PARSER_NODE_NAMES.closeTag:
        this.nodeLevel--;
        break;
      case PARSER_NODE_NAMES.tagName:
        this.nodeBuilder.createQueryNode(this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to), this.isExpanded, this.nodeLevel);
        break;
      case PARSER_NODE_NAMES.attributeName:
        this.nodeBuilder.setAttributeName(this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to), iteratingNode.from, iteratingNode.to);
        break;
      case PARSER_NODE_NAMES.attributeValue:
        this.nodeBuilder.setAttributeValue(this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to), iteratingNode.from, iteratingNode.to);
        break;
      case PARSER_NODE_NAMES.endTag:
        this.addNodeToTree(xmlParseErrors);
        break;
    }
  }

  addNodeToTree(xmlParseErrors: Diagnostic[]) {
    let buildResult = this.nodeBuilder.buildQueryNode();
    if (buildResult.isBuildSuccess) {
      this.nodeTree.addNode(buildResult.queryNode); //TODO: use nodetree service instead of nodeTree
    } else {
      for (let error of buildResult.errors) {
        xmlParseErrors.push({
          from: error.from,
          to: error.to,
          message: error.message,
          severity: 'error'
        });
      }
    }
  }
}
