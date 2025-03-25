import { Component, EventEmitter, OnInit, Output, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subject, takeUntil, BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { NodeTreeService } from '../services/node-tree.service';
import { TUI_ICON_RESOLVER, TuiIcon } from '@taiga-ui/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TuiInputInline } from '@taiga-ui/kit';
import { CommonModule } from '@angular/common';
import { iconResolver } from '../../../app.module';

@Component({
  selector: 'app-query-tree-button-block',
  templateUrl: './query-tree-button-block.component.html',
  styleUrls: ['./query-tree-button-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiInputInline,
    TuiIcon
  ],
  providers: [
    {
      provide: TUI_ICON_RESOLVER,
      useFactory: iconResolver
    }
  ]
})
export class QueryTreeButtonBlockComponent implements OnInit, OnDestroy {
  protected testForm = new FormGroup({
    testValue1: new FormControl('Untitled Query'),    
  });

  @Output() executeXmlRequest = new EventEmitter<void>();

  buttonDisabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  // Create a local property to bind to in the template
  isButtonDisabled = false;
  
  errorMessages$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  private destroy$ = new Subject<void>();

  constructor(private nodeTreeProcessor: NodeTreeService) { }

  ngOnInit() {
    this.setupButtonState();
    
    // Subscribe to the observable and update the local property
    this.buttonDisabled$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(disabled => {
      this.isButtonDisabled = disabled;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  } 

  execute() {
    this.executeXmlRequest.emit();
  }

  toggleQueryOptions() {
    // This will be called when chevron is clicked
    console.log('Chevron clicked, toggle query options');
    // Add your logic here to handle the chevron click
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
