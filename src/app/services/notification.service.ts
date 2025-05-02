import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })

export class NotificationService {
    constructor(private snackBar: MatSnackBar) { }

    showSuccess(message: string, action: string = 'Close', duration: number = 5000): void {
        this.snackBar.open(message, action, {
            duration: duration,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['success-snackbar']
        });
    }

    showError(message: string, action: string = 'Close', duration: number = 5000): void {
        this.snackBar.open(message, action, {
            duration: duration,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
        });
    }

    showInfo(message: string, action: string = 'Close', duration: number = 5000): void {
        this.snackBar.open(message, action, {
            duration: duration,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
        });
    }
} 