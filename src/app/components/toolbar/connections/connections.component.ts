import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subscription } from 'rxjs';
import { EnvironmentModel } from 'src/app/models/environment-model';
import { ConnectionsDialogComponent } from './connections-dialog/connections-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
import { EventBusService } from 'src/app/services/event-bus/event-bus.service';
import { AppEvents } from 'src/app/services/event-bus/app-events';
import { EnvironmentEntityService } from 'src/app/components/query-builder/services/entity-services/environment-entity.service';
import { MatRippleModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ConnectionsDesktopComponent } from './connections-desktop/connections-desktop.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatRippleModule,
    MatIconModule
  ],
  selector: 'app-connections',
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.css']
})
export class ConnectionsComponent implements OnInit, OnDestroy {

  @Output() onEnvironmentConnection = new EventEmitter<EnvironmentModel>()
  activeEnvironment$: Observable<EnvironmentModel>
  private subscriptions: Subscription = new Subscription();

  constructor(private dialog: MatDialog,
    private _authService: AuthService,
    private _environmentEntityService: EnvironmentEntityService,
    private _eventBus: EventBusService) { }

  ngOnInit() {
    this.refreshActiveEnvironment();
    
    const envChangeSub = this._eventBus.on(AppEvents.ENVIRONMENT_CHANGED, () => {
      console.log('ConnectionsComponent: Environment changed event received');
      this.refreshActiveEnvironment();
    });
    
    this.subscriptions.add(envChangeSub);
  }

  private refreshActiveEnvironment() {
    console.log('ConnectionsComponent: Refreshing active environment');
    this.activeEnvironment$ = this._environmentEntityService.getActiveEnvironment();
  }

  openDesktopEnvironmentDialog(){
    this.dialog.open(ConnectionsDesktopComponent, {
      height: '340px',
      width: '400px',
    })
  }

  openDialog() {
    if (!this._authService.userIsLoggedIn) {
      this._authService.loginPopup()
      const loginSub = this._eventBus.on(AppEvents.LOGIN_SUCCESS, () => {
        this.createDialog()
      })
      this.subscriptions.add(loginSub);
    } else {
      this.createDialog()
    }
  }

  private createDialog() {
    this.dialog.open(ConnectionsDialogComponent, {
      height: '600px',
      width: '420px',
    })
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}