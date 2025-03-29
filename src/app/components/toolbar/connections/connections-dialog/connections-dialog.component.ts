import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { EnvironmentModel } from 'src/app/models/environment-model';
import { EventData } from 'src/app/services/event-bus/event-data';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { EnvironmentEntityService } from 'src/app/components/query-builder/services/entity-services/environment-entity.service';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule, MatRippleModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatProgressBarModule } from '@angular/material/progress-bar';


@Component({
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatRippleModule,
    MatOptionModule,
    MatSelectModule,
    CommonModule,
    MatProgressBarModule
  ],
  selector: 'app-connections-dialog',
  templateUrl: './connections-dialog.component.html',
  styleUrls: ['./connections-dialog.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ConnectionsDialogComponent implements OnInit {
  environmentsList$: Observable<EnvironmentModel[]>;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private dialogRef: MatDialogRef<ConnectionsDialogComponent>,
    private navigationService: NavigationService,
    private _environmentEntityService: EnvironmentEntityService,
    private eventBus: EventBusService,
  ) { }

  ngOnInit() {
    this.isLoading$.next(true);
    this.environmentsList$ = this._environmentEntityService.getEnvironments().pipe(tap(() => {
      this.isLoading$.next(false);
    }));
  }

  connectToEnvironment(selectedEnv: EnvironmentModel) {
    let currentEnvironmentUrl = this.navigationService.getCurrentEnvironmentUrl();

    if (currentEnvironmentUrl != selectedEnv.url) {
      this.navigationService.navigateToEnv(selectedEnv);
      this.eventBus.emit(new EventData(AppEvents.ENVIRONMENT_CHANGED, null));
      console.warn('env changed');
    }
    this.closeDialog();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
