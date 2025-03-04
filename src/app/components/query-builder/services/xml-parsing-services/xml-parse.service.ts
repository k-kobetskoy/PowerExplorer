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

  constructor(
    private parsingHelper: ParsingHelperService,
    private nodeBuilder: QueryNodeBuilderService,
    private nodeTreeService: NodeTreeService,
    private attributeFactoryResolver: AttributeFactoryResorlverService,
    private eventBus: EventBusService
  ) { }

  private sanitizeValue(value: string): string {
    if (!value) return value;
    return value
      .replace(/&(?![a-zA-Z]+;)/g, '&amp;') // Replace & not part of an entity
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/\x00/g, ''); // Remove null bytes
  }

  parseNode(iteratingNode: SyntaxNodeRef, view: EditorView, xmlParseErrors: Diagnostic[]) {
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

    let buildResult = this.nodeBuilder.buildQueryNode();

    if (buildResult.isBuildSuccess) {

      let node = this.nodeTreeService.addNodeFromParsing(buildResult.queryNode.nodeName);

      if (this.nodeBuilder.attributes.length > 0) {
        const attributeFactory = this.attributeFactoryResolver.getAttributesFactory(buildResult.queryNode.nodeName);

        for (let attribute of this.nodeBuilder.attributes) {
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
      this.eventBus.emit({ name: AppEvents.XML_PARSED, value: true });
    }
  }

  removeQuotes(str: string): string {
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, - 1);
    }
    return str;
  }
}
