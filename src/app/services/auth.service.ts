import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { EventBusService } from './event-bus/event-bus.service';
import { EventData } from './event-bus/event-data';
import { AppEvents } from './event-bus/app-events';
import { USER_IS_LOGGED_IN } from '../models/tokens';
import { ElectronService } from './electron.service';

// Forward-reference declaration of ElectronAuthService to avoid circular dependency
declare const ElectronAuthService: any;

@Injectable({ providedIn: 'root' })
export class AuthService {

  isIframe = false;
  private isElectronApp: boolean = false;
  private electronAuthService: any; // Will be set if in Electron environment

  public get userIsLoggedIn() {
    return this._userIsLoggedIn.value;
  }

  public get userIsLoggedIn$() {
    return this._userIsLoggedIn.asObservable();
  }

  constructor(
    @Inject(USER_IS_LOGGED_IN) private _userIsLoggedIn: BehaviorSubject<boolean>,
    private eventBus: EventBusService,
    private electronService: ElectronService) {

    console.log('[AUTH-SERVICE] Constructor called');
    this.isElectronApp = this.electronService.isElectronApp;
    
    // Always start with logged out state in Electron
    console.log('[AUTH-SERVICE] Setting initial logged out state for Electron');
    this._userIsLoggedIn.next(false);
    localStorage.removeItem('electronUserLoggedIn');
  }

  // Set the electron auth service - called by app component to avoid circular dependency
  setElectronAuthService(service: any) {
    console.log('[AUTH-SERVICE] Setting electronAuthService');
    this.electronAuthService = service;
  }

  private readonly _destroying$ = new Subject<void>();

  init() {
    console.log('[AUTH-SERVICE] Init called, isElectronApp:', this.isElectronApp);
    
    // Check if user was previously logged in
    const isLoggedIn = localStorage.getItem('electronUserLoggedIn') === 'true';
    if (isLoggedIn) {
      console.log('[AUTH-SERVICE] Found previous login, setting status to logged in');
      this._userIsLoggedIn.next(true);
    }
  }

  setLoginDisplay() {
    // For Electron, we'll use localStorage
    const isLoggedIn = localStorage.getItem('electronUserLoggedIn') === 'true';
    console.log('[AUTH-SERVICE] Setting login display for Electron:', isLoggedIn);
    this._userIsLoggedIn.next(isLoggedIn);
  }

  loginPopup(environmentUrl?: string, userConfig?: any) {
    console.log('[AUTH-SERVICE] loginPopup called, electronAuthService available:', !!this.electronAuthService);
    
    if (this.electronAuthService) {
      // For Electron authentication, use the ElectronAuthService
      console.log('[AUTH-SERVICE] Using Electron auth flow');
      this.electronAuthService.login(environmentUrl, userConfig).subscribe(success => {
        console.log('[AUTH-SERVICE] Electron login result:', success);
        if (success) {
          localStorage.setItem('electronUserLoggedIn', 'true');
          this._userIsLoggedIn.next(true);
          console.log('[AUTH-SERVICE] Emitting LOGIN_SUCCESS event');
          this.eventBus.emit(new EventData(AppEvents.LOGIN_SUCCESS, null));
        } else {
          console.log('[AUTH-SERVICE] Electron login failed');
          localStorage.removeItem('electronUserLoggedIn');
          this._userIsLoggedIn.next(false);
        }
      });
    } else {
      console.log('[AUTH-SERVICE] No authentication service available');
    }
  }

  logout() {
    if (this.electronAuthService) {
      // Electron-specific logout
      this.electronAuthService.logout().subscribe(success => {
        if (success) {
          localStorage.removeItem('electronUserLoggedIn');
          this._userIsLoggedIn.next(false);
          this.eventBus.emitAndSaveLast(new EventData(AppEvents.USER_REMOVED, null));
        }
      });
    }
  }

  /**
   * Dummy method to satisfy dependencies - not used in Electron mode
   */
  addProtectedResourceToInterceptorConfig(url: string) {
    console.log('[AUTH-SERVICE] addProtectedResourceToInterceptorConfig called (dummy)', url);
    // No-op in Electron
  }

  /**
   * Dummy method to satisfy dependencies - not used in Electron mode
   */
  checkProtectedResource() {
    console.log('[AUTH-SERVICE] checkProtectedResource called (dummy)');
    // No-op in Electron
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}