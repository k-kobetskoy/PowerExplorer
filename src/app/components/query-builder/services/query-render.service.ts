import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, combineLatest, distinctUntilChanged, map, of, switchMap, takeUntil, catchError, debounceTime } from 'rxjs';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { NodeTreeService } from './node-tree.service';
import { QueryNode } from '../models/query-node';
import { NodeAttribute } from '../models/node-attribute';
import { XmlParseService } from './xml-parsing-services/xml-parse.service';
import { ValueAttributeData } from '../models/constants/attribute-data';

@Injectable({ providedIn: 'root' })
export class QueryRenderService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private previousNodeLevel = -1;
  private closingTags: string[] = [];
  private currentNode: QueryNode;

  constructor(
    private nodeTreeService: NodeTreeService, 
    private eventBus: EventBusService,
    private xmlParseService: XmlParseService
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const events = [AppEvents.NODE_ADDED, AppEvents.NODE_REMOVED, AppEvents.XML_PARSED];
    events.forEach(event => {
      this.eventBus.on(event, () => this.renderXmlRequest());
    });
  }

  renderXmlRequest(): void {
    try {
      // Disable parsing during XML generation to prevent circular updates
      this.xmlParseService.isParsingEnabled = false;
      
      this.resetState();
      this.currentNode = this.nodeTreeService.getNodeTree().value.root;
  
      const observables$ = this.generateNodeObservables();
      this.processObservables(observables$);
    } catch (error) {
      console.error('Error rendering XML:', error);
    }
  }

  private resetState(): void {
    this.destroy$.next();
    this.previousNodeLevel = -1;
    this.closingTags = [];
  }

  private generateNodeObservables(): Observable<string>[] {
    const observables: Observable<string>[] = [];
    
    while (this.currentNode != null || this.closingTags.length > 0) {
      observables.push(this.processNode(this.currentNode));
    }

    return observables;
  }

  private processObservables(observables: Observable<string>[]): void {
    combineLatest(observables).pipe(
      map(values => values.join('\n')),
      distinctUntilChanged(),
      catchError(error => {
        console.error('Error rendering XML:', error);
        return of('');
      }),
      takeUntil(this.destroy$),
      debounceTime(30)
    ).subscribe(xml => {

      this.nodeTreeService.xmlRequest$.next(xml);    
    });
  }

  private processNode(node: QueryNode): Observable<string> {
    if (!node) {
      return of(this.closingTags.shift() || '');
    }

    if (this.previousNodeLevel > node.level) {
      this.previousNodeLevel--;
      return of(this.closingTags.shift() || '');
    }

    const observable = this.renderNodeTag(node);
    this.updateNodeState(node);
    return observable;
  }

  private renderNodeTag(node: QueryNode): Observable<string> {
    // Only add closing tags for expandable nodes that are not value nodes with text content
    if (node.expandable) {
      // For value nodes with text, we'll handle them differently in createExpandableNodeString
      const isValueNodeWithText = node.tagName === 'value' && 
        node.attributes$.value.some(attr => attr.editorName === ValueAttributeData.InnerText.EditorName);
      
      // Only push closing tag if not a value node with text (those are self-contained)
      if (!isValueNodeWithText) {
        this.closingTags.unshift(this.createClosingTag(node));
      }
    }

    // Special handling for value nodes to properly subscribe to the text content changes
    if (node.tagName === 'value') {
      const textAttribute = node.attributes$.value.find(attr => 
        attr.editorName === ValueAttributeData.InnerText.EditorName
      );
      
      if (textAttribute) {
        // Combine the node attributes with the text value to ensure reactivity
        return combineLatest([
          node.attributes$.pipe(
            switchMap(attributes => this.formatAttributes(attributes))
          ),
          textAttribute.value$
        ]).pipe(
          map(([attributesString, textValue]) => {
            const indent = this.getIndent(node.level);
            const otherAttributes = attributesString
              .replace(new RegExp(`\\b${ValueAttributeData.InnerText.EditorName}="[^"]*"\\s*`, 'g'), '')
              .trim();
            
            if (otherAttributes) {
              return `${indent}<${node.tagName} ${otherAttributes}>${textValue || ''}</${node.tagName}>`;
            } else {
              return `${indent}<${node.tagName}>${textValue || ''}</${node.tagName}>`;
            }
          })
        );
      }
    }

    // Standard handling for other nodes
    return node.attributes$.pipe(
      switchMap(attributes => this.formatAttributes(attributes).pipe(
        map(attributesString => this.createNodeString(node, attributesString))
      ))
    );
  }

  private createNodeString(node: QueryNode, attributesString: string): string {
    const indent = this.getIndent(node.level);
    
    // Special handling for value nodes with text content is now in renderNodeTag
    // This method now only handles standard nodes
    
    return node.expandable
      ? this.createExpandableNodeString(node, attributesString, indent)
      : this.createSelfClosingNodeString(node, attributesString, indent);
  }

  private formatAttributes(attributes: NodeAttribute[]): Observable<string> {
    if (!attributes || attributes.length === 0) {
      return of('');
    }

    // Filter out the inner text attribute for value nodes - those are handled specially
    const filteredAttributes = attributes.filter(attr => 
      !(attr.parentNode.tagName === 'value' && attr.editorName === ValueAttributeData.InnerText.EditorName)
    );

    if (filteredAttributes.length === 0) {
      return of('');
    }

    const attributeObservables$ = filteredAttributes.map(attr => 
      combineLatest([
        attr.value$,
        attr.attributeDisplayValues.editorViewDisplayValue$
      ]).pipe(
        map(([value, displayValue]) => {
          // Check if value exists and is not empty string (avoids treating "0" as falsy)
          return value !== undefined && value !== '' ? displayValue : '';
        })
      )
    );

    return combineLatest(attributeObservables$).pipe(
      map(values => values.filter(v => v !== '').join(' ')),
      catchError(() => of(''))
    );
  }

  private createExpandableNodeString(node: QueryNode, attributes: string, indent: string): string {
    return attributes.trim().length > 0
      ? `${indent}<${node.tagName} ${attributes}>`
      : `${indent}<${node.tagName}>`;
  }

  private createSelfClosingNodeString(node: QueryNode, attributes: string, indent: string): string {
    return attributes.trim().length > 0
      ? `${indent}<${node.tagName} ${attributes} />`
      : `${indent}<${node.tagName} />`;
  }

  private createClosingTag(node: QueryNode): string {
    return `${this.getIndent(node.level)}</${node.tagName}>`;
  }

  private updateNodeState(node: QueryNode): void {
    this.previousNodeLevel = node.level;
    this.currentNode = node.next;
  }

  private getIndent(level: number): string {
    return '  '.repeat(level);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
