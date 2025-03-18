import { Component, EventEmitter, OnInit, Output, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, map, takeUntil, BehaviorSubject, shareReplay, distinctUntilChanged } from 'rxjs';
import { NodeTreeService } from '../services/node-tree.service';

@Component({
  selector: 'app-query-tree-button-block',
  templateUrl: './query-tree-button-block.component.html',
  styleUrls: ['./query-tree-button-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueryTreeButtonBlockComponent implements OnInit, OnDestroy {

  @Output() executeXmlRequest = new EventEmitter<void>()

  buttonDisabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  errorMessages$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
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
    this.nodeTreeProcessor.validationResult$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => 
        prev.isValid === curr.isValid)
    ).subscribe(validationResult => {
      this.buttonDisabled$.next(!validationResult.isValid);
      this.errorMessages$.next(validationResult.errors);
    });
  }
}
