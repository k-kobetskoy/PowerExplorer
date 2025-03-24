import { Injectable } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { ErrorDialogComponent } from '../components/error-dialog/error-dialog.component';
import { PolymorpheusComponent } from '@tinkoff/ng-polymorpheus';

export interface ErrorDialogData {
  title: string;
  message: string;
  details?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorDialogService {
  constructor(private dialogService: TuiDialogService) {}

  showError(data: ErrorDialogData): void {
    const dialogData = {
      title: data.title || 'Error',
      message: data.message || 'An error occurred',
      details: data.details || ''
    };
    
    this.dialogService.open(
      new PolymorpheusComponent(ErrorDialogComponent), 
      { data: dialogData, dismissible: true, size: 's' }
    );
  }

  showHttpError(error: any): void {
    if (!error) {
      this.showError({
        title: 'Error',
        message: 'An unknown error occurred'
      });
      return;
    }

    let errorMessage = 'An error occurred';
    let errorDetails = '';

    // Handle standard HTTP error response
    if (error.error?.message) {
      errorMessage = error.error.message;
    }

    // Handle detailed error information
    if (error.error?.error?.message) {
      errorMessage = error.error.error.message;
    }

    // Add additional error details if available
    if (error.error?.error?.code) {
      errorDetails = `Error code: ${error.error.error.code}`;
    }

    this.showError({
      title: 'Request Failed',
      message: errorMessage,
      details: errorDetails
    });
  }
} 