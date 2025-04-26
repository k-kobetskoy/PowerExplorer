import { Component, OnInit } from '@angular/core';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatLabel } from '@angular/material/form-field';
import { MatDialogRef } from '@angular/material/dialog';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EventData } from 'src/app/services/event-bus/event-data';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { DesktopNavigationService } from 'src/app/services/desktop-navigation.service';

@Component({
  selector: 'app-connections-desktop',
  templateUrl: './connections-desktop.component.html',
  styleUrls: ['./connections-desktop.component.css'],
  standalone: true,
  imports: [MatFormField, MatInput, MatButton, MatLabel, ReactiveFormsModule]
})
export class ConnectionsDesktopComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<ConnectionsDesktopComponent>,
    private navigationService: DesktopNavigationService,
    private eventBus: EventBusService) { }

  environmentUrlFormControl = new FormControl('');
  environmentFriendlyNameFormControl = new FormControl('My Environment');
  ngOnInit() {
  }

  connectToEnvironment() {
    let currentEnvironmentUrl = this.navigationService.getCurrentEnvironmentUrl();

    if (currentEnvironmentUrl != this.environmentUrlFormControl.value) {
      this.navigationService.navigateToEnv(this.environmentUrlFormControl.value, this.environmentFriendlyNameFormControl.value);
      this.eventBus.emit(new EventData(AppEvents.ENVIRONMENT_CHANGED, null));
      console.warn('env changed');
    }
    this.closeDialog();
  }

  closeDialog() {
    this.dialogRef.close();
  }

}
