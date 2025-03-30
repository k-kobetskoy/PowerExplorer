import { Component, EventEmitter, OnInit, Output, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, map, takeUntil, BehaviorSubject, shareReplay, distinctUntilChanged, tap, take } from 'rxjs';
import { NodeTreeService } from '../services/node-tree.service';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ValidationResult } from '../services/validation.service';
import { XmlExecutorService } from '../services/xml-executor.service';
import { QueryRenderService } from '../services/query-render.service';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { AppEvents } from 'src/app/services/event-bus/app-events';

@Component({
  selector: 'app-query-tree-button-block',
  templateUrl: './query-tree-button-block.component.html',
  styleUrls: ['./query-tree-button-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class QueryTreeButtonBlockComponent implements OnInit, OnDestroy {
  protected testForm = new FormGroup({
    testValue1: new FormControl('Untitled Query'),    
  });

  @Output() executeXmlRequest = new EventEmitter<void>();

  // Use a BehaviorSubject for more control over the disabled state
  private validationState = new BehaviorSubject<ValidationResult>({ isValid: false, errors: ['Initial state'] });
  buttonDisabled$: Observable<ValidationResult> = this.validationState.asObservable();
  
  errorMessages$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  private destroy$ = new Subject<void>();

  constructor(
    private nodeTreeProcessor: NodeTreeService,
    private xmlExecutorService: XmlExecutorService,
    private queryRenderService: QueryRenderService,
    private eventBus: EventBusService
  ) { }

  ngOnInit() {
    // Subscribe to the actual validation observable 
    this.nodeTreeProcessor.validationResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe(validation => {
        if (validation) {
          this.validationState.next(validation);
        }
      });
    
    // Listen for XML_PARSED events
    this.eventBus.on(AppEvents.XML_PARSED, event => {
      // Force a recheck of validation state after parsing
      setTimeout(() => {
        this.nodeTreeProcessor.validationResult$
          .pipe(take(1))
          .subscribe(validation => {
            // If valid, update the state
            if (validation && validation.isValid) {
              this.validationState.next(validation);
            }
          });
      }, 200);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  } 

  execute() {
    console.log('Executing query...');
    
    // First notify parent component that execution was requested
    this.executeXmlRequest.emit();
    
    // Render the XML query
    this.queryRenderService.renderXmlRequest();
    
    // Get the current XML and entity node
    const xml = this.nodeTreeProcessor.xmlRequest$.value;
    const entityNode = this.nodeTreeProcessor.getNodeTree().value.root.next;
    
    if (!xml || !entityNode) {
      console.error('Cannot execute query: XML or entity node is missing');
      return;
    }
    
    console.log('Executing XML query:', xml.substring(0, 100) + '...');
    
    // Execute the XML query and update the cache
    this.xmlExecutorService.executeAndCacheResult(xml, entityNode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        result => {
          console.log('Query execution completed successfully:', {
            rowCount: result.rawValues?.length || 0,
            headerCount: Object.keys(result.header || {}).length || 0
          });
        },
        error => {
          console.error('Error executing query:', error);
        }
      );
  }
}