import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, map, of, switchMap, takeUntil } from 'rxjs';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { NodeTreeService } from './node-tree.service';
import { QueryNode } from '../models/query-node';

export class ClosingTagsStack {
  private store: string[] = [];

  count: number = 0;

  push(tagName: string): void {
    this.count = this.store.unshift(tagName);
  }

  pop(): string {
    const poppedValue = this.store.shift();
    this.count--;
    return poppedValue;
  }
}

@Injectable({ providedIn: 'root' })
export class QueryRenderService implements OnDestroy {
  private _destroy$ = new Subject<void>();
  private _previousNodeLevel: number = -1;
  private _closingTagsStack = new ClosingTagsStack();
  private _currentNode: QueryNode;
  private _previousNodeIsExpandable: boolean = false;

  constructor(private nodeTreeProcessor: NodeTreeService, private eventBus: EventBusService) {
    this.eventBus.on(AppEvents.NODE_ADDED, () => this.renderXmlRequest());
    this.eventBus.on(AppEvents.NODE_REMOVED, () => this.renderXmlRequest());
  }

  renderXmlRequest() {
    this._destroy$.next();
    this._previousNodeLevel = -1;
    this._currentNode = this.nodeTreeProcessor.getNodeTree().value.root;

    const observables$: Observable<string>[] = [];
    const dynamicObservables$: BehaviorSubject<Observable<string>[]> = new BehaviorSubject([]);

    while (this._currentNode != null || this._closingTagsStack.count != 0) {
      observables$.push(this.processNode(this._currentNode));
    }

    dynamicObservables$.next(observables$);

    dynamicObservables$.pipe(
      switchMap(obsList => combineLatest(obsList)),
      map(values => values.join('\n')),
      distinctUntilChanged(),
      takeUntil(this._destroy$))
      .subscribe(value => this.nodeTreeProcessor.xmlRequest$.next(value));
  }

  processNode(node: QueryNode): Observable<string> {
    if (this._currentNode === null) {
      return of(this._closingTagsStack.pop());
    }

    if (this._previousNodeLevel > node.level) {
      this._previousNodeLevel--;
      return of(this._closingTagsStack.pop());
    }

    const observable = this.getNodeTag(node);
    this._previousNodeLevel = node.level;
    this._currentNode = node.next;
    this._previousNodeIsExpandable = node.expandable;
    return observable;
  }

  getNodeTag(node: QueryNode): Observable<string> {
    if (node.expandable) {
      this._closingTagsStack.push(`${this.getIndent(node.level)}</${node.tagName}>`);
    }

    return node.attributes$.pipe(map(attributes => {
      const attributesString = attributes
        .filter(attribute => attribute.value$.value !== '') // Skip empty attributes
        .map(attribute => attribute.attributeDisplayValues.editorViewDisplayValue$)
        .join(' ');

      const hasAttributes = attributesString.trim().length > 0;
      const indentation = this.getIndent(node.level);

      if (node.expandable) {
        return hasAttributes 
          ? `${indentation}<${node.tagName} ${attributesString}>`
          : `${indentation}<${node.tagName}>`;
      } else {
        return hasAttributes
          ? `${indentation}<${node.tagName} ${attributesString} />`
          : `${indentation}<${node.tagName} />`;
      }
    }));
  }

  private getIndent(level: number): string {
    return '  '.repeat(level); // Use 2 spaces for indentation
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
