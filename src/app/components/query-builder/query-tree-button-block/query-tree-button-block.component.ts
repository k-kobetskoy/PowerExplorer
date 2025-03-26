import { Component, EventEmitter, OnInit, Output, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, map, takeUntil, BehaviorSubject, shareReplay, distinctUntilChanged } from 'rxjs';
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

  buttonDisabled$: Observable<ValidationResult>;
  // Create a local property to bind to in the template
  
  errorMessages$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  private destroy$ = new Subject<void>();

  constructor(private nodeTreeProcessor: NodeTreeService) { }

  ngOnInit() {
    this.buttonDisabled$ = this.nodeTreeProcessor.validationResult$;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  } 

  execute() {
    this.executeXmlRequest.emit();
  }
}