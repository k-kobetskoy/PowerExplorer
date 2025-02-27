import { ParsingHelperService } from './parsing-helper.service';
import { Injectable } from '@angular/core';
import { SyntaxNodeRef } from '@lezer/common';
import { Diagnostic } from "@codemirror/lint";
import { QueryNodeTree } from '../../models/query-node-tree';
import { EditorView } from 'codemirror';
import { QueryNodeBuilderService } from './query-node-builder.service';
import { NodeTreeService } from '../node-tree.service';
import { syntaxTree } from "@codemirror/language";

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
  // Flag to control when parsing should update the node tree
  isParsingEnabled: boolean = false;

  constructor(private parsingHelper: ParsingHelperService, private nodeBuilder: QueryNodeBuilderService, private nodeTreeService: NodeTreeService) { }

  parseNode(iteratingNode: SyntaxNodeRef, view: EditorView, xmlParseErrors: Diagnostic[]) {
    // Skip node processing if parsing is disabled
    if (!this.isParsingEnabled) {
      return;
    }

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
      this.nodeTreeService.addNodeFromParsing(buildResult.queryNode.nodeName);
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

  resetParserState() {
    this.nodeLevel = -1;
    this.isExpanded = false;
    this.from = null;
    this.to = null;
  }

  // Method to handle the Parse XML button click
  parseXmlManually(view: EditorView) {
    try {
      this.nodeTreeService.prepareTreeForParsing();

      this.resetParserState();

      this.isParsingEnabled = true;

      const xmlParseErrors: Diagnostic[] = [];

      // Iterate through the syntax tree and parse each node
      syntaxTree(view.state).cursor().iterate(iteratingNode => {
        this.parseNode(iteratingNode, view, xmlParseErrors);
      });

      if (xmlParseErrors.length > 0) {
        console.error('XML Parse Errors:', xmlParseErrors);
      }
    } finally {
      this.isParsingEnabled = false;
    }
  }
}
