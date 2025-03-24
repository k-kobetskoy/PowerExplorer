import { Component, EventEmitter, OnInit, Output, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Observable, Subject, map, takeUntil, BehaviorSubject, shareReplay, distinctUntilChanged } from 'rxjs';
import { NodeTreeService } from '../services/node-tree.service';
import { Icons } from '../../svg-icons/icons';

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

  // Method to get icon path based on name parameter
  getIcon(iconName: string): string {
    // Convert to uppercase for case-insensitive comparison
    const name = iconName.toUpperCase();
    
    switch (name) {
      case 'PLAY':
        return Icons.PLAY;
      case 'PARSE':
        return Icons.PARSE;
      case 'COPY':
        return Icons.COPY;
      case 'TRASH':
      case 'TRASH-2':
        return Icons.TRASH;
      case 'PLUS':
        return Icons.PLUS;
      case 'DOWNLOAD':
        return Icons.DOWNLOAD;
      case 'SETTINGS':
        return Icons.SETTINGS;
      case 'CHEVRONS-UP-DOWN':
        return Icons.CHEVRONS_UP_DOWN;
      case 'RIGHT-ARROW':
      case 'RIGHTARROW':
        return Icons.RIGHT_ARROW;
      default:
        console.warn(`Icon "${iconName}" not found, falling back to Play icon`);
        return Icons.PLAY;
    }
  }
  
  // Keep for backward compatibility
  getPlayIcon(): string {
    return this.getIcon('play');
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
