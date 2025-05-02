import { Inject, Injectable } from '@angular/core';

import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { EventBusService } from './event-bus/event-bus.service';
import { EventData } from './event-bus/event-data';
import { AppEvents } from './event-bus/app-events';
import { ACTIVE_ENVIRONMENT_MODEL, ACTIVE_ACCOUNT_MODEL } from '../models/tokens';
import { EnvironmentModel } from '../models/environment-model';
import { AccountInfo } from '@azure/msal-browser';
import { NotificationService } from './notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ElectronService } from './electron.service';

@Injectable({ providedIn: 'root' })

export class DesktopAuthService {
  constructor(
    @Inject(ACTIVE_ENVIRONMENT_MODEL) private activeEnvironmentModel: BehaviorSubject<EnvironmentModel>,
    @Inject(ACTIVE_ACCOUNT_MODEL) private activeAccount: BehaviorSubject<AccountInfo>,
    private electronService: ElectronService,
    private eventBus: EventBusService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) { 
    this.initializeListeners();
  }

  private initializeListeners(): void {
    if (!this.electronService.isElectronApp || !this.electronService.electron) {
      return;
    }

    // Listen for active environment changes from electron side
    this.electronService.receive('environment-changed', (environment: EnvironmentModel) => {
      console.log('[ELECTRON-AUTH] Environment changed from electron side:', environment);
      if (environment) {
        this.activeEnvironmentModel.next(environment);
      } else {
        this.activeEnvironmentModel.next(null);
      }
    });

    // Listen for active account changes from electron side
    this.electronService.receive('account-changed', (account: AccountInfo) => {
      console.log('[ELECTRON-AUTH] Account changed from electron side:', account);
      if (account) {
        this.activeAccount.next(account);
      } else {
        this.activeAccount.next(null);
        this.eventBus.emit(new EventData(AppEvents.USER_REMOVED, null));
      }
    });

    // Listen for auth success/failure messages
    this.electronService.receive('auth-success', (data: { account: AccountInfo }) => {
      console.log('[ELECTRON-AUTH] Authentication successful:', data);
      if (data && data.account) {
        this.activeAccount.next(data.account);
        this.eventBus.emit(new EventData(AppEvents.LOGIN_SUCCESS, null));
        this.notificationService.showSuccess('Login successful');
        // Navigate to home or dashboard
        this.router.navigate(['/']);
      }
    });

    this.electronService.receive('auth-failed', (data: { error: string, errorDescription: string }) => {
      console.error('[ELECTRON-AUTH] Authentication failed:', data);
      this.notificationService.showError(`Login failed: ${data.errorDescription || data.error || 'Unknown error'}`);
    });

    // Listen for app returned from auth event
    this.electronService.receive('app-returned-from-auth', () => {
      console.log('[ELECTRON-AUTH] App returned from auth redirect');
      this.notificationService.showInfo('Welcome back to Power Explorer');
      // If we already have an active account, no need to do anything else
      if (this.activeAccount.value) {
        this.eventBus.emit(new EventData(AppEvents.LOGIN_SUCCESS, null));
      }
    });
  }

  /**
   * Handle auth redirect params
   * @param params URL parameters from the redirect
   */
  handleAuthRedirect(params: Record<string, string>): Observable<boolean> {
    if (!this.electronService.isElectronApp) {
      return of(false);
    }

    return from(this.electronService.auth.handleRedirect(params)).pipe(
      map(result => {
        console.log('[ELECTRON-AUTH] Handle redirect result:', result);
        return result.success;
      }),
      catchError(error => {
        console.error('[ELECTRON-AUTH] Error handling redirect:', error);
        return of(false);
      })
    );
  }

  setActiveEnvironment(environmentModel: EnvironmentModel): Observable<boolean> {
    if (!this.electronService.isElectronApp) {
      return of(false);
    }

    return from(this.electronService.environment.setActive(environmentModel)).pipe(
      map(result => {
        console.log('[ELECTRON-AUTH] Set environment URL result:', result);
        this.activeEnvironmentModel.next(environmentModel);
        
        if (result.success) {
          this.notificationService.showSuccess(`Connected to ${environmentModel.friendlyName}`);
        } else {
          this.notificationService.showError(`Failed to connect to ${environmentModel.friendlyName}`);
        }
        
        return result.success;
      }),
      catchError(error => {
        console.error('[ELECTRON-AUTH] Error setting environment URL:', error);
        this.notificationService.showError(`Error connecting to ${environmentModel.friendlyName}`);
        return of(false);
      })
    );
  }

  getEnvironments(): Observable<EnvironmentModel[]> {
    if (!this.electronService.isElectronApp) {
      return of([]);
    }

    return from(this.electronService.environment.getModels()).pipe(
      map(result => result.environments)
    );
  }

  updateActiveAccount(): void {
    if (!this.electronService.isElectronApp || !this.electronService.electron) {
      return;
    }

    from(this.electronService.auth.getActiveAccount()).subscribe(account => {
      this.activeAccount.next(account);
    });
  }

  updateActiveEnvironment(): void {
    console.log('[DESKTOP-AUTH] Updating active environment');
    if (!this.electronService.isElectronApp || !this.electronService.electron) {
      return;
    }

    from(this.electronService.environment.getActive()).subscribe(result => {
      if (result.success && result.environment) {
        console.log('[DESKTOP-AUTH] Active environment updated:', result.environment);
        this.activeEnvironmentModel.next(result.environment);
      }
    });
  }

  /**
   * Initiate the login process
   */
  login(environmentModel: EnvironmentModel): Observable<boolean> {
    if (!this.electronService.isElectronApp || !this.electronService.electron) {
      return of(false);
    }

    return from(this.electronService.auth.login(environmentModel)).pipe(
      tap(result => {
        console.log('[ELECTRON-AUTH] Login result:', result);
        if (result.success) {
          console.log('[ELECTRON-AUTH] Login successful, setting token');
          this.activeAccount.next(result.account);
          this.activeEnvironmentModel.next(environmentModel);
          this.eventBus.emit(new EventData(AppEvents.LOGIN_SUCCESS, null));
          this.notificationService.showSuccess(`Successfully logged in to ${environmentModel.friendlyName}`);
        } else {
          console.log('[ELECTRON-AUTH] Login failed');
          this.activeAccount.next(null);
          this.activeEnvironmentModel.next(null);
          this.notificationService.showError('Login failed');
        }
      }),
      map(result => result.success),
      catchError(error => {
        console.error('[ELECTRON-AUTH] Login error:', error);
        this.activeAccount.next(null);
        this.activeEnvironmentModel.next(null);
        this.notificationService.showError('Login error: ' + (error.message || 'Unknown error'));
        return of(false);
      })
    );
  }

  /**
   * Get an access token for the specified scopes
   */
  getToken(environmentModel: EnvironmentModel): Observable<string | null> {
    if (!this.electronService.isElectronApp || !this.electronService.electron) {
      return of(null);
    }

    return from(this.electronService.auth.getToken(environmentModel)).pipe(      
      map(result => result.success ? result.accessToken : null),
      catchError(error => {
        console.error('[ELECTRON-AUTH] Get token error:', error);
        return of(null);
      })
    );
  }

  /**
   * Log the user out
   */
  logout(): Observable<boolean> {
    if (!this.electronService.isElectronApp) {
      return of(false);
    }

    return from(this.electronService.auth.logout()).pipe(
      tap(result => {
        console.log('[ELECTRON-AUTH] Logout result:', result);
        // this.activeAccount.next(null);
        // this.activeEnvironmentModel.next(null);
        this.eventBus.emitAndSaveLast(new EventData(AppEvents.USER_REMOVED, null));
        this.notificationService.showInfo('You have been logged out');
      }),
      map(result => true), 
      catchError(error => {
        this.activeAccount.next(null);
        this.activeEnvironmentModel.next(null);
        this.eventBus.emitAndSaveLast(new EventData(AppEvents.USER_REMOVED, null));
        this.notificationService.showInfo('You have been logged out');
        return of(true); // Always consider logout successful
      })
    );
  }

} 