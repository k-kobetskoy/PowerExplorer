import { Component, Inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@tinkoff/ng-polymorpheus';
import { CommonModule } from '@angular/common';

export interface ErrorDialogData {
  title: string;
  message: string;
  details?: string;
}

@Component({
  selector: 'app-error-dialog',
  templateUrl: './error-dialog.component.html',
  styleUrls: ['./error-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule
  ]
})
export class ErrorDialogComponent {
  constructor(
    @Inject(POLYMORPHEUS_CONTEXT)
    public context: TuiDialogContext<void, ErrorDialogData>
  ) {}

  close(): void {
    this.context.completeWith();
  }
} 