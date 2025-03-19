import { Injectable } from '@angular/core';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorView } from '@codemirror/view';
import { Diagnostic } from "@codemirror/lint"
import { ParsingHelperService } from './parsing-helper.service';


export const TAG_NODE_NAMES = {
  openTag: 'OpenTag',
  closeTag: 'CloseTag',
  startTag: 'StartTag',
  startCloseNode: 'StartCloseTag',
  tagName: 'TagName',
  endTag: 'EndTag',
  text: 'Text',
  selfClosingTag: 'SelfClosingTag',
  selfClosingEndNode: 'SelfCloseEndTag',
  element: 'Element',
  mismatchedCloseNode: 'MismatchedCloseTag',
  unexpectedParsingError: '⚠'
};

export const PARSING_ERRORS = {
  genericTagError: 'There is a problem with the tag. Are you missing something?',
  missingClosingTag: 'Missing closing tag',
  missingTagName: 'Missing tag name',
  unexpectedParsingError: 'Unexpected parsing error. Please check you XML',
  mismatchedCloseTag: 'Mismatched close tag',
  unwantedText: 'Unwanted text'
};

export const TAG_NODES = {
  openTagNodes: ['EndTag', 'TagName', 'StartTag'],
  closeTagNodes: ['EndTag', 'TagName', 'StartCloseTag'],
  selfClosingTagNodes: ['SelfCloseEndTag', 'TagName', 'StartTag'],
};

@Injectable({ providedIn: 'root' })

export class XmlValidationService {
  // Track error positions to avoid duplicates
  private reportedErrorPositions: Set<string> = new Set();
  private currentView: EditorView | null = null;

  constructor(private parsingHelper: ParsingHelperService) { }

  validateTagNode(iteratingNode: SyntaxNodeRef, tagsValidationStack: { mandatoryNodes: string[]; from: number; to: number; }[], diagnostics: Diagnostic[], sequenceValidationStack: string[], view: EditorView) {
    // Reset error tracking for each validation run
    if (iteratingNode.node.parent === null) {
      this.reportedErrorPositions = new Set();
      this.currentView = view;
    }

    switch (iteratingNode.name) {
      case TAG_NODE_NAMES.element:
        this.addElementNodesToStack(iteratingNode, tagsValidationStack);
        this.validateElement(iteratingNode, diagnostics);
        break;
      case TAG_NODE_NAMES.openTag:
        sequenceValidationStack.push(TAG_NODE_NAMES.openTag);
        break;
      case TAG_NODE_NAMES.closeTag:
        sequenceValidationStack.push(TAG_NODE_NAMES.closeTag);
        break;
      case TAG_NODE_NAMES.selfClosingTag:
        sequenceValidationStack.push(TAG_NODE_NAMES.selfClosingTag);
        break;
      case TAG_NODE_NAMES.text:
        // Only validate text if it's not within a valid tag structure
        if (!this.hasErrorNearby(iteratingNode.from, iteratingNode.to, diagnostics)) {
          this.validateTextNode(iteratingNode, diagnostics, view);
        }
        break;
      case TAG_NODE_NAMES.startTag:
        if (this.validateStartNode(iteratingNode, sequenceValidationStack, diagnostics)) {
          this.removeNodeFromStack(tagsValidationStack, diagnostics, iteratingNode);
        }
        break;
      case TAG_NODE_NAMES.startCloseNode:
        if (this.validateStartCloseNode(iteratingNode, sequenceValidationStack, diagnostics)) {
          this.removeNodeFromStack(tagsValidationStack, diagnostics, iteratingNode);
        }
        break;
      case TAG_NODE_NAMES.tagName:
        this.removeNodeFromStack(tagsValidationStack, diagnostics, iteratingNode);
        break;
      case TAG_NODE_NAMES.endTag:
        this.removeNodeFromStack(tagsValidationStack, diagnostics, iteratingNode);
        this.validateElementNodes(tagsValidationStack, diagnostics);
        tagsValidationStack.pop();
        break;
      case TAG_NODE_NAMES.selfClosingEndNode:
        this.removeNodeFromStack(tagsValidationStack, diagnostics, iteratingNode);
        this.validateElementNodes(tagsValidationStack, diagnostics);
        tagsValidationStack.pop();
        break;
      case TAG_NODE_NAMES.mismatchedCloseNode:
        // This is a high-priority error, always show it
        this.addValidationError(PARSING_ERRORS.mismatchedCloseTag, iteratingNode.from, iteratingNode.to, diagnostics);
        break;
      case TAG_NODE_NAMES.unexpectedParsingError:
        // Only show unexpected parsing errors if there are no other errors
        if (diagnostics.length === 0) {
          this.addValidationError(PARSING_ERRORS.unexpectedParsingError, iteratingNode.from, iteratingNode.to, diagnostics);
        }
        break;
    }
  }

  validateTextNode(iteratingNode: SyntaxNodeRef, diagnostics: Diagnostic[], view: EditorView) {
    let text = this.parsingHelper.getNodeAsString(view, iteratingNode.from, iteratingNode.to);

    if (!text) return;

    if (text.trim() === '') {
      return;
    }

    const nonWhitespaceIndexs = this.findNonWhitespaceIndexs(text);

    const from = nonWhitespaceIndexs.firstNonWhitespaceIndex === -1
      ? iteratingNode.from
      : iteratingNode.from + nonWhitespaceIndexs.firstNonWhitespaceIndex;
    const to = nonWhitespaceIndexs.lastNonWhitespaceIndex === -1
      ? iteratingNode.to
      : iteratingNode.from + nonWhitespaceIndexs.lastNonWhitespaceIndex;

    this.addValidationError(PARSING_ERRORS.unwantedText, from, to, diagnostics);
  }

  findNonWhitespaceIndexs(text: string): { firstNonWhitespaceIndex: number; lastNonWhitespaceIndex: number; } {
    let firstNonWhitespaceIndex = -1;
    let lastNonWhitespaceIndex = -1;

    for (let i = 0; i < text.length; i++) {
      if (!this.isSpace(text.charCodeAt(i)) && firstNonWhitespaceIndex === -1) {
        firstNonWhitespaceIndex = i;
      }
      if (firstNonWhitespaceIndex > -1 && !this.isSpace(text.charCodeAt(i))) {
        lastNonWhitespaceIndex = i + 1;
      }
    }

    return { firstNonWhitespaceIndex, lastNonWhitespaceIndex };
  }

  isSpace(ch: number): boolean {
    return ch === 9 || ch === 10 || ch === 13 || ch === 32;
  }

  validateStartNode(iteratingNode: SyntaxNodeRef, sequenceValidationStack: string[], diagnostics: Diagnostic[]): boolean {
    if (sequenceValidationStack.length === 0) {
      this.addValidationError(PARSING_ERRORS.unexpectedParsingError, iteratingNode.from, iteratingNode.to, diagnostics);
      return false;
    }

    let expectedNodeName = sequenceValidationStack.at(-1)

    if (expectedNodeName === TAG_NODE_NAMES.openTag || expectedNodeName === TAG_NODE_NAMES.selfClosingTag) {
      sequenceValidationStack.pop();
      return true;
    }

    // Only report this error if we're not already reporting a higher-level error
    if (!this.hasErrorNearby(iteratingNode.from, iteratingNode.to, diagnostics)) {
      this.addValidationError(PARSING_ERRORS.genericTagError, iteratingNode.from, iteratingNode.to, diagnostics);
    }
    return false;
  }

  validateStartCloseNode(iteratingNode: SyntaxNodeRef, sequenceValidationStack: string[], diagnostics: Diagnostic[]): boolean {
    if (sequenceValidationStack.length === 0) {
      this.addValidationError(PARSING_ERRORS.unexpectedParsingError, iteratingNode.from, iteratingNode.to, diagnostics);
      return false;
    }

    let expectedNodeName = sequenceValidationStack.at(-1)

    if (expectedNodeName === TAG_NODE_NAMES.closeTag) {
      sequenceValidationStack.pop();
      return true;
    }

    // Only report this error if we're not already reporting a higher-level error
    if (!this.hasErrorNearby(iteratingNode.from, iteratingNode.to, diagnostics)) {
      this.addValidationError(PARSING_ERRORS.genericTagError, iteratingNode.from, iteratingNode.to, diagnostics);
    }
    return false;
  }

  // Check if there's already an error reported nearby
  hasErrorNearby(from: number, to: number, diagnostics: Diagnostic[], threshold: number = 10): boolean {
    return diagnostics.some(d => 
      (Math.abs(d.from - from) < threshold || Math.abs(d.to - to) < threshold)
    );
  }

  addValidationError(errorMessage: string, from: number, to: number, diagnostics: Diagnostic[]) {
    // Create a unique key for this error position
    const errorKey = `${from}-${to}-${errorMessage}`;
    
    // Skip if we've already reported an error at this position
    if (this.reportedErrorPositions.has(errorKey)) {
      return;
    }
    
    // Skip if there's already an error nearby with the same message
    if (diagnostics.some(d => 
      d.message === errorMessage && 
      (Math.abs(d.from - from) < 15 || Math.abs(d.to - to) < 15)
    )) {
      return;
    }
    
    // Prioritize specific errors over generic ones
    if (errorMessage === PARSING_ERRORS.genericTagError) {
      // If there's any error nearby, don't add generic errors
      if (this.hasErrorNearby(from, to, diagnostics)) {
        return;
      }
      
      // Limit to one generic error per line
      const line = this.getLineFromPosition(from);
      if (diagnostics.some(d => 
        d.message === PARSING_ERRORS.genericTagError && 
        this.getLineFromPosition(d.from) === line
      )) {
        return;
      }
    }
    
    // Prioritize specific errors
    if (errorMessage === PARSING_ERRORS.unexpectedParsingError) {
      // Don't show unexpected parsing errors if there are other errors
      if (diagnostics.length > 0) {
        return;
      }
    }
    
    // Add to our tracking set
    this.reportedErrorPositions.add(errorKey);
    
    diagnostics.push({
      from: from,
      to: to,
      severity: 'error',
      message: errorMessage
    });
  }
  

  private getLineFromPosition(pos: number): number {
    if (this.currentView) {
      return this.currentView.state.doc.lineAt(pos).number;
    }
    return 0;
  }

  validateElementNodes(tagsValidationStack: { mandatoryNodes: string[]; from: number; to: number; }[], diagnostics: Diagnostic[]) {
    if (tagsValidationStack.length === 0) {
      this.addValidationError(PARSING_ERRORS.unexpectedParsingError, 0, 0, diagnostics);
      return;
    }

    let currentTagData = tagsValidationStack.at(-1);

    if (currentTagData.mandatoryNodes.length > 0) {
      // Only report the most specific error
      if (currentTagData.mandatoryNodes.includes(TAG_NODE_NAMES.tagName)) {
        // Only report missing tag name if there's no other error nearby
        if (!this.hasErrorNearby(currentTagData.from, currentTagData.to, diagnostics)) {
          this.addValidationError(PARSING_ERRORS.missingTagName, currentTagData.from, currentTagData.to, diagnostics);
        }
      } else if (!this.hasErrorNearby(currentTagData.from, currentTagData.to, diagnostics)) {
        this.addValidationError(PARSING_ERRORS.genericTagError, currentTagData.from, currentTagData.to, diagnostics);
      }
    }
  }

  removeNodeFromStack(tagsValidationStack: { mandatoryNodes: string[]; from: number; to: number; }[], diagnostics: Diagnostic[], iteratingNode: SyntaxNodeRef) {
    if (tagsValidationStack.length === 0) {
      this.addValidationError(PARSING_ERRORS.genericTagError, 0, 0, diagnostics);
      return;
    }

    let currentTagNodes = tagsValidationStack.at(-1);

    if (currentTagNodes.mandatoryNodes.at(-1) === iteratingNode.name) {
      currentTagNodes.mandatoryNodes.pop();
      return;
    } else {
      // Only report this error if we're not already reporting a higher-level error
      if (!this.hasErrorNearby(currentTagNodes.from, currentTagNodes.to, diagnostics)) {
        this.addValidationError(PARSING_ERRORS.genericTagError, currentTagNodes.from, currentTagNodes.to, diagnostics);
      }
    }
  }

  validateElement(iteratingNode: SyntaxNodeRef, diagnostics: Diagnostic[]) {
    const openingTag = iteratingNode.node.firstChild;
    const closingTag = iteratingNode.node.lastChild;

    if (openingTag.name === TAG_NODE_NAMES.selfClosingTag) {
      return;
    }

    if (!closingTag || closingTag.name !== TAG_NODE_NAMES.closeTag) {
      this.addValidationError(PARSING_ERRORS.missingClosingTag, openingTag.from, openingTag.to, diagnostics);
    }
  }

  addElementNodesToStack(elementNode: SyntaxNodeRef, tagsValidationStack: { mandatoryNodes: string[]; from: number; to: number; }[]) {
    const openingTag = elementNode.node.firstChild;
    const closingTag = elementNode.node.lastChild;

    if (openingTag.name === TAG_NODE_NAMES.selfClosingTag && closingTag.name === TAG_NODE_NAMES.selfClosingTag) {
      tagsValidationStack.push({
        mandatoryNodes: [...TAG_NODES.selfClosingTagNodes],
        from: openingTag.from,
        to: openingTag.to
      });
      return;
    }

    tagsValidationStack.push({
      mandatoryNodes: [...TAG_NODES.closeTagNodes],
      from: closingTag.from,
      to: closingTag.to
    });

    tagsValidationStack.push({
      mandatoryNodes: [...TAG_NODES.openTagNodes],
      from: openingTag.from,
      to: openingTag.to
    });
  }
}
