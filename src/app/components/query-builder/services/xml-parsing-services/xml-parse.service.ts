import { ParsingHelperService } from './parsing-helper.service';
import { Injectable } from '@angular/core';
import { SyntaxNodeRef } from '@lezer/common';
import { Diagnostic } from "@codemirror/lint";
import { QueryNodeTree } from '../../models/query-node-tree';
import { EditorView } from 'codemirror';
import { QueryNodeBuilderService } from './query-node-builder.service';
import { XML_EVENTS } from '../node-tree.service';
import { syntaxTree } from "@codemirror/language";
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
  
  // Flag to track programmatic updates - prevents node creation during XML rendering
  isProgrammaticUpdate: boolean = false;

  constructor(
    private parsingHelper: ParsingHelperService, 
    private nodeBuilder: QueryNodeBuilderService,
    private eventBus: EventBusService
  ) {}

  // Set the programmatic update flag and notify others
  setIsProgrammaticUpdate(value: boolean): void {
    this.isProgrammaticUpdate = value;
    // Notify the NodeTreeService about the state change
    this.eventBus.emit({
      name: XML_EVENTS.SET_PROGRAMMATIC_UPDATE,
      value: value
    });
  }

  parseNode(iteratingNode: SyntaxNodeRef, view: EditorView, xmlParseErrors: Diagnostic[]) {
    console.log(iteratingNode.name);
    if (iteratingNode.name === PARSER_NODE_NAMES.element) {
      console.log(iteratingNode.from, iteratingNode.to);
    }

    switch (iteratingNode.name) {
      case PARSER_NODE_NAMES.openTag:
        // Skip node structure elements during programmatic updates
        if (this.isProgrammaticUpdate) return;
        this.isExpanded = true;
        this.nodeLevel++;
        break;
      case PARSER_NODE_NAMES.selfClosingTag:
        // Skip node structure elements during programmatic updates
        if (this.isProgrammaticUpdate) return;
        this.isExpanded = false;
        break;
      case PARSER_NODE_NAMES.closeTag:
        // Skip node structure elements during programmatic updates
        if (this.isProgrammaticUpdate) return;
        this.nodeLevel--;
        break;
      case PARSER_NODE_NAMES.tagName:
        // Skip node structure elements during programmatic updates
        if (this.isProgrammaticUpdate) return;
        this.nodeBuilder.createQueryNode(this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to), this.isExpanded, this.nodeLevel);
        break;
      case PARSER_NODE_NAMES.attributeName:
        // Always process attributes to allow bidirectional updates
        this.nodeBuilder.setAttributeName(this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to), iteratingNode.from, iteratingNode.to);
        break;
      case PARSER_NODE_NAMES.attributeValue:
        // Always process attributes to allow bidirectional updates
        this.nodeBuilder.setAttributeValue(this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to), iteratingNode.from, iteratingNode.to);
        break;
      case PARSER_NODE_NAMES.endTag:
        // Skip node structure elements during programmatic updates
        if (this.isProgrammaticUpdate) return;
        this.addNodeToTree(xmlParseErrors);
        break;
    }
  }

  addNodeToTree(xmlParseErrors: Diagnostic[]) {
    // Skip node addition during programmatic updates
    if (this.isProgrammaticUpdate) return;
    
    let buildResult = this.nodeBuilder.buildQueryNode();
    if (buildResult.isBuildSuccess) {
      // Always use event system to add nodes
      this.eventBus.emit({ 
        name: XML_EVENTS.ADD_XML_NODE, 
        value: buildResult.queryNode.nodeName 
      });
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
  
  /**
   * Method to enable manual parsing of XML from the editor
   * This should be called by a button click or other user action
   * @param view The CodeMirror editor view
   * @returns Array of diagnostic errors, if any
   */
  parseXmlManually(view: EditorView): Diagnostic[] {
    // Reset the node tree before parsing
    this.eventBus.emit({ name: XML_EVENTS.INITIALIZE_NODE_TREE });
    
    // Ensure flag is cleared for manual parsing
    this.setIsProgrammaticUpdate(false);
    
    // Reset parse state
    this.isExpanded = false;
    this.nodeLevel = -1;
    
    // Create a new array for errors
    const xmlParseErrors: Diagnostic[] = [];
    
    // Trigger parsing of each node in the syntax tree
    syntaxTree(view.state).cursor().iterate(iteratingNode => {
      this.parseNode(iteratingNode, view, xmlParseErrors);
    });
    
    return xmlParseErrors;
  }
}
