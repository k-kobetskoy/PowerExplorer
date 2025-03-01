import { ParsingHelperService } from './parsing-helper.service';
import { Injectable } from '@angular/core';
import { SyntaxNodeRef } from '@lezer/common';
import { Diagnostic } from "@codemirror/lint";
import { QueryNodeTree } from '../../models/query-node-tree';
import { EditorView } from 'codemirror';
import { QueryNodeBuilderService } from './query-node-builder.service';
import { NodeTreeService } from '../node-tree.service';
import { syntaxTree } from "@codemirror/language";
import { AttributeFactoryResorlverService } from '../attribute-services/attribute-factory-resorlver.service';

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
  // Flag to control when parsing should update the node tree
  isParsingEnabled: boolean = false;

  constructor(
    private parsingHelper: ParsingHelperService,
    private nodeBuilder: QueryNodeBuilderService,
    private nodeTreeService: NodeTreeService,
    private attributeFactoryResolver: AttributeFactoryResorlverService
  ) { }

  parseNode(iteratingNode: SyntaxNodeRef, view: EditorView, xmlParseErrors: Diagnostic[]) {
    // Skip node processing if parsing is disabled
    if (!this.isParsingEnabled) {
      return;
    }

    console.log(`Processing node: ${iteratingNode.name} at level ${this.nodeLevel} [${iteratingNode.from}-${iteratingNode.to}]`);

    switch (iteratingNode.name) {
      case PARSER_NODE_NAMES.openTag:
        this.isExpanded = true;
        this.nodeLevel++;
        this.isCloseTag = false;
        break;
      case PARSER_NODE_NAMES.selfClosingTag:
        this.isExpanded = false;
        break;
      case PARSER_NODE_NAMES.closeTag:
        this.nodeLevel--;
        this.isCloseTag = true;
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
      default:
        if (iteratingNode.name) {
          console.log(`Found other node type: ${iteratingNode.name} at level ${this.nodeLevel}`);
        }
    }
  }

  addNodeToTree(xmlParseErrors: Diagnostic[]) {
    console.log("=== Building node with collected attributes:", this.nodeBuilder.attributes);

    let buildResult = this.nodeBuilder.buildQueryNode();

    if (buildResult.isBuildSuccess) {

      let node = this.nodeTreeService.addNodeFromParsing(buildResult.queryNode.nodeName);
      console.log("=== Node added to tree:", node);

      // Add the attributes to the newly created node
      if (this.nodeBuilder.attributes.length > 0) {
        const attributeFactory = this.attributeFactoryResolver.getAttributesFactory(buildResult.queryNode.nodeName);

        for (let attribute of this.nodeBuilder.attributes) {
          console.log(`=== Adding attribute ${attribute.name}=${attribute.value} to node`);
          let nodeAttribute = attributeFactory.createAttribute(attribute.name, node, true, attribute.value);
          node.addAttribute(nodeAttribute);
        }
      }
    } else {
      console.error("=== Failed to build node:", buildResult.errors);
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
