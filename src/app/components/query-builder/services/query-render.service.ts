import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, combineLatest, distinctUntilChanged, map, of, switchMap, takeUntil, catchError } from 'rxjs';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { NodeTreeService } from './node-tree.service';
import { QueryNode } from '../models/query-node';
import { NodeAttribute } from '../models/node-attribute';

@Injectable({ providedIn: 'root' })
export class QueryRenderService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private previousNodeLevel = -1;
  private closingTags: string[] = [];
  private currentNode: QueryNode;

  constructor(
    private nodeTreeService: NodeTreeService, 
    private eventBus: EventBusService
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const events = [AppEvents.NODE_ADDED, AppEvents.NODE_REMOVED];
    events.forEach(event => {
      this.eventBus.on(event, () => this.renderXmlRequest());
    });
  }

  renderXmlRequest(): void {
    this.resetState();
    this.currentNode = this.nodeTreeService.getNodeTree().value.root;

    const observables$ = this.generateNodeObservables();
    this.processObservables(observables$);
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
      takeUntil(this.destroy$)
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
    if (node.expandable) {
      this.closingTags.unshift(this.createClosingTag(node));
    }

    return node.attributes$.pipe(
      switchMap(attributes => this.formatAttributes(attributes).pipe(
        map(attributesString => this.createNodeString(node, attributesString))
      ))
    );
  }

  private createNodeString(node: QueryNode, attributesString: string): string {
    const indent = this.getIndent(node.level);
    
    return node.expandable
      ? this.createExpandableNodeString(node, attributesString, indent)
      : this.createSelfClosingNodeString(node, attributesString, indent);
  }

  private formatAttributes(attributes: NodeAttribute[]): Observable<string> {
    if (!attributes || attributes.length === 0) {
      return of('');
    }

    const attributeObservables$ = attributes.map(attr => 
      combineLatest([
        attr.value$,
        attr.attributeDisplayValues.editorViewDisplayValue$
      ]).pipe(
        map(([value, displayValue]) => {
          // Skip default values
          if (value === 'false' || value === '0') {
            return '';
          }
          return value ? displayValue : '';
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
