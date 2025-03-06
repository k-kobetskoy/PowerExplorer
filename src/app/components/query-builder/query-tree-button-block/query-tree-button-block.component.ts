import { Component, EventEmitter, OnInit, Output, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, map, takeUntil } from 'rxjs';
import { NodeTreeService } from '../services/node-tree.service';

@Component({
  selector: 'app-query-tree-button-block',
  templateUrl: './query-tree-button-block.component.html',
  styleUrls: ['./query-tree-button-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueryTreeButtonBlockComponent implements OnInit, OnDestroy {

  @Output() executeXmlRequest = new EventEmitter<void>()

  buttonDisabled$: Observable<boolean>;
  private destroy$ = new Subject<void>();

  constructor(private nodeTreeProcessor: NodeTreeService) { }

  ngOnInit() {
    this.setupButtonState();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  execute() {
    this.executeXmlRequest.emit();
  }

  private setupButtonState(): void {
    this.buttonDisabled$ = this.nodeTreeProcessor.isExecutable$.pipe(
      map(isExecutable => !isExecutable),
      takeUntil(this.destroy$)
    );
  }
}
