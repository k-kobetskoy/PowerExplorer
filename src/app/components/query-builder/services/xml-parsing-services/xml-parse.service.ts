import { SyntaxNodeRef } from '@lezer/common';
import { ParsingHelperService } from './parsing-helper.service';
import { Injectable, Inject } from '@angular/core';
import { syntaxTree } from '@codemirror/language';
import { Diagnostic } from "@codemirror/lint";
import { QueryNodeTree } from '../../models/query-node-tree';
import { EditorView } from '@codemirror/view';
import { QueryNodeBuilderService } from './query-node-builder.service';
import { NodeTreeService } from '../node-tree.service';
import { NodeFactoryService } from '../attribute-services/node-factory.service';

import { QueryNode } from '../../models/query-node';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { AppEvents } from 'src/app/services/event-bus/app-events';


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
  isCloseTag: boolean = false;
  isParsingEnabled: boolean = false;

  // Add a stack to track parent nodes
  private parentNodeStack = [];
  private currentParentNode = null;

  constructor(
    private parsingHelper: ParsingHelperService,
    private nodeBuilder: QueryNodeBuilderService,
    private nodeTreeService: NodeTreeService,
    private attributeFactoryResolver: NodeFactoryService,
    private eventBus: EventBusService
  ) { }

  parseNode(iteratingNode: SyntaxNodeRef, view: EditorView, xmlParseErrors: Diagnostic[]) {
    if (!this.isParsingEnabled) {
      return;
    }

    switch (iteratingNode.name) {
      case PARSER_NODE_NAMES.openTag:
        this.isExpanded = true;
        this.nodeLevel++;
        this.isCloseTag = false;
        break;
      case PARSER_NODE_NAMES.selfClosingTag:
        this.isExpanded = false;
        this.isCloseTag = false;
        break;
      case PARSER_NODE_NAMES.closeTag:
        this.nodeLevel--;
        this.isCloseTag = true;

        if (this.parentNodeStack.length > 0) {
          const poppedParent = this.parentNodeStack.pop();
          this.currentParentNode = poppedParent;
        }
        break;
      case PARSER_NODE_NAMES.tagName:
        if (this.isCloseTag) {
          return;
        }
        const tagName = this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to);
        this.nodeBuilder.createQueryNode(tagName, this.isExpanded, this.nodeLevel);
        break;
      case PARSER_NODE_NAMES.attributeName:
        if (this.isCloseTag) {
          return;
        }
        const attrName = this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to);
        this.nodeBuilder.setAttributeName(attrName, iteratingNode.from, iteratingNode.to);
        break;
      case PARSER_NODE_NAMES.attributeValue:
        if (this.isCloseTag) {
          return;
        }
        const attrValue = this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to);
        this.nodeBuilder.setAttributeValue(this.removeQuotes(attrValue), iteratingNode.from, iteratingNode.to);
        break;
      case PARSER_NODE_NAMES.endTag:
        if (this.isCloseTag) {
          return;
        }
        this.addNodeToTree(xmlParseErrors);
        break;
      case PARSER_NODE_NAMES.selfClosingEndNode:
        this.addNodeToTree(xmlParseErrors);
        break;
    }
  }

  addNodeToTree(xmlParseErrors: Diagnostic[]) {
    let buildResult = this.nodeBuilder.buildQueryNode();

    let node = this.nodeTreeService.addNodeFromParsing(
      buildResult.nodeName,
      this.currentParentNode
    );

    if (buildResult.attributes.length > 0) {
      const attributeFactory = this.attributeFactoryResolver.getAttributesFactory(buildResult.nodeName);

      for (let attribute of buildResult.attributes) {
        let nodeAttribute = attributeFactory.createAttribute(attribute.name, node, true, attribute.value);
        node.addAttribute(nodeAttribute);
      }
    }

    if (this.isExpanded) {
      this.parentNodeStack.push(this.currentParentNode);
      this.currentParentNode = node;
    }

    for (let error of buildResult.errors) {
      xmlParseErrors.push({
        from: error.from,
        to: error.to,
        message: error.message,
        severity: 'error'
      });
    }
  }

  resetParserState() {
    this.nodeLevel = -1;
    this.isExpanded = false;
    this.from = null;
    this.to = null;
    this.parentNodeStack = [];
    this.currentParentNode = null;
    this.isCloseTag = false;
  }

  parseXmlManually(view: EditorView) {
    try {
      this.resetParserState();
      this.nodeTreeService.clearNodeTree();
      this.isParsingEnabled = true;

      const xmlParseErrors: Diagnostic[] = [];

      // Iterate through the syntax tree and parse each node
      syntaxTree(view.state).cursor().iterate(iteratingNode => {
        this.parseNode(iteratingNode, view, xmlParseErrors);
      });

      if (xmlParseErrors.length > 0) {
        console.error('XML Parse Errors:', xmlParseErrors);
      }
      
      if (!this.nodeTreeService.getNodeTree().value) {
        this.nodeTreeService.initializeNodeTree();
      }
      
      this.eventBus.emit({ name: AppEvents.XML_PARSED, value: true });
    } finally {
      this.isParsingEnabled = false;
    }
  }

  removeQuotes(str: string): string {
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, - 1);
    }
    return str;
  }
}
