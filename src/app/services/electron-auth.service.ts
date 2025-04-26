import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ElectronAuthService {
  private isAuthenticated = new BehaviorSubject<boolean>(false);
  private accessToken = new BehaviorSubject<string | null>(null);
  private currentEnvironmentUrl: string | null = null;
  
  constructor(
    private electronService: ElectronService,
    private authService: AuthService,
    private configService: ConfigService
  ) {
    console.log('[ELECTRON-AUTH] Service initialized');
    // Start in logged-out state
    this.isAuthenticated.next(false);
    this.accessToken.next(null);
  }

  /**
   * Set the current environment URL for authentication
   */
  setEnvironmentUrl(environmentUrl: string): Observable<boolean> {
    console.log('[ELECTRON-AUTH] Setting environment URL:', environmentUrl);
    this.currentEnvironmentUrl = environmentUrl;
    
    if (!this.electronService.isElectronApp) {
      console.error('[ELECTRON-AUTH] Not running in Electron');
      return of(false);
    }
    
    return from(this.electronService.auth.setEnvironmentUrl(environmentUrl)).pipe(
      map(result => {
        console.log('[ELECTRON-AUTH] Set environment URL result:', result);
        return result.success;
      }),
      catchError(error => {
        console.error('[ELECTRON-AUTH] Error setting environment URL:', error);
        // Even if setting the URL fails, still store it locally for future use
        // This way we can still try to use it for login
        this.currentEnvironmentUrl = environmentUrl;
        return of(true); // Return true to allow login flow to continue
      })
    );
  }

  /**
   * Check if user is already authenticated
   */
  checkAuthentication(): Observable<boolean> {
    console.log('[ELECTRON-AUTH] Checking authentication status');
    if (!this.electronService.isElectronApp) {
      console.error('[ELECTRON-AUTH] Not running in Electron');
      return of(false);
    }

    return from(this.electronService.auth.getToken(['User.Read'], this.currentEnvironmentUrl)).pipe(
      tap(result => {
        console.log('[ELECTRON-AUTH] Token check result:', result);
        if (result.success && result.accessToken) {
          console.log('[ELECTRON-AUTH] User is authenticated');
          this.accessToken.next(result.accessToken);
          this.isAuthenticated.next(true);
        } else {
          console.log('[ELECTRON-AUTH] User is not authenticated');
          this.isAuthenticated.next(false);
          this.accessToken.next(null);
        }
      }),
      map(result => result.success && !!result.accessToken),
      catchError(error => {
        console.error('[ELECTRON-AUTH] Authentication check error:', error);
        this.isAuthenticated.next(false);
        this.accessToken.next(null);
        return of(false);
      })
    );
  }

  /**
   * Initiate the login process
   */
  login(environmentUrl?: string, userConfig?: any): Observable<boolean> {
    console.log('[ELECTRON-AUTH] Login initiated');
    if (!this.electronService.isElectronApp) {
      console.error('[ELECTRON-AUTH] Not running in Electron');
      return of(false);
    }

    // Update environment URL if provided
    if (environmentUrl) {
      this.currentEnvironmentUrl = environmentUrl;
      console.log('[ELECTRON-AUTH] Environment URL updated to:', environmentUrl);
    }

    // If no user config provided, create one with environment-specific scopes
    if (!userConfig && this.currentEnvironmentUrl) {
      // Create a scope specifically for this environment
      const apiUrl = this.currentEnvironmentUrl.endsWith('/') 
        ? this.currentEnvironmentUrl.slice(0, -1) 
        : this.currentEnvironmentUrl;
      
      userConfig = {
        scopes: [`${apiUrl}/user_impersonation`]
      };
      console.log('[ELECTRON-AUTH] Created environment-specific scopes:', userConfig.scopes);
    }

    // Clear any existing state
    this.isAuthenticated.next(false);
    this.accessToken.next(null);

    if (!this.currentEnvironmentUrl) {
      console.error('[ELECTRON-AUTH] No environment URL set, login will likely fail');
    }

    console.log('[ELECTRON-AUTH] Calling electron auth.login() with environment:', this.currentEnvironmentUrl);
    console.log('[ELECTRON-AUTH] Using user config:', userConfig);
    
    return from(this.electronService.auth.login(this.currentEnvironmentUrl, userConfig)).pipe(
      tap(result => {
        console.log('[ELECTRON-AUTH] Login result:', result);
        if (result.success) {
          console.log('[ELECTRON-AUTH] Login successful, setting token');
          this.accessToken.next(result.accessToken);
          this.isAuthenticated.next(true);
        } else {
          console.log('[ELECTRON-AUTH] Login failed');
          this.isAuthenticated.next(false);
          this.accessToken.next(null);
        }
      }),
      map(result => result.success),
      catchError(error => {
        console.error('[ELECTRON-AUTH] Login error:', error);
        this.isAuthenticated.next(false);
        this.accessToken.next(null);
        return of(false);
      })
    );
  }

  /**
   * Get an access token for the specified scopes
   */
  getToken(scopes: string[] = []): Observable<string | null> {
    console.log('[ELECTRON-AUTH] Getting token for scopes:', scopes);
    if (!this.electronService.isElectronApp) {
      console.error('[ELECTRON-AUTH] Not running in Electron');
      return of(null);
    }

    console.log('[ELECTRON-AUTH] Calling electron auth.getToken() with environment:', this.currentEnvironmentUrl);
    return from(this.electronService.auth.getToken(scopes, this.currentEnvironmentUrl)).pipe(
      tap(result => {
        console.log('[ELECTRON-AUTH] Get token result:', result);
        if (result.success) {
          console.log('[ELECTRON-AUTH] Token acquired successfully');
          this.accessToken.next(result.accessToken);
          this.isAuthenticated.next(true);
        } else {
          console.log('[ELECTRON-AUTH] Failed to get token');
          if (!this.isAuthenticated.value) {
            this.accessToken.next(null);
          }
        }
      }),
      map(result => result.success ? result.accessToken : null),
      catchError(error => {
        console.error('[ELECTRON-AUTH] Get token error:', error);
        if (!this.isAuthenticated.value) {
          this.accessToken.next(null);
        }
        return of(null);
      })
    );
  }

  /**
   * Log the user out
   */
  logout(): Observable<boolean> {
    console.log('[ELECTRON-AUTH] Logout initiated');
    if (!this.electronService.isElectronApp) {
      console.error('[ELECTRON-AUTH] Not running in Electron');
      return of(false);
    }

    console.log('[ELECTRON-AUTH] Calling electron auth.logout()');
    return from(this.electronService.auth.logout()).pipe(
      tap(result => {
        console.log('[ELECTRON-AUTH] Logout result:', result);
        // Always clear state on logout, regardless of success
        this.accessToken.next(null);
        this.isAuthenticated.next(false);
        this.currentEnvironmentUrl = null;
      }),
      map(result => true), // Always consider logout successful
      catchError(error => {
        console.error('[ELECTRON-AUTH] Logout error:', error);
        this.accessToken.next(null);
        this.isAuthenticated.next(false);
        this.currentEnvironmentUrl = null;
        return of(true); // Always consider logout successful
      })
    );
  }

  /**
   * Get the current authentication status
   */
  isAuthenticatedUser(): Observable<boolean> {
    console.log('[ELECTRON-AUTH] Getting authentication status:', this.isAuthenticated.value);
    return this.isAuthenticated.asObservable();
  }

  /**
   * Get the current access token
   */
  getCurrentToken(): Observable<string | null> {
    console.log('[ELECTRON-AUTH] Getting current token');
    return this.accessToken.asObservable();
  }
} 