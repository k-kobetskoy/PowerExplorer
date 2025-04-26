import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ElectronService } from './electron.service';
import { Observable, catchError, of, BehaviorSubject } from 'rxjs';

/**
 * Service to provide special configuration overrides for Electron environment
 */
@Injectable({
  providedIn: 'root'
})
export class ElectronConfigService {
  private isInitialized = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private electronService: ElectronService
  ) {
    console.log('[ELECTRON-CONFIG] Service initialized');
  }

  /**
   * Initialize the configuration specifically for Electron
   */
  initializeConfig(): void {
    if (!this.electronService.isElectronApp) {
      console.log('[ELECTRON-CONFIG] Not in Electron environment, skipping');
      return;
    }

    console.log('[ELECTRON-CONFIG] Initializing Electron-specific configuration');
    
    // Override any global configuration/settings that might interfere with Electron auth
    
    // Set initialized flag
    this.isInitialized.next(true);
  }
  
  /**
   * Get the initialized state
   */
  get isInitializedState(): Observable<boolean> {
    return this.isInitialized.asObservable();
  }

  /**
   * Get the appropriate configuration URL based on the runtime environment
   */
  getConfigUrl(): string {
    if (this.electronService.isElectronApp) {
      return 'assets/electron-configuration.json';
    }
    return 'assets/configuration.json';
  }

  /**
   * Load configuration from the appropriate source
   */
  loadConfig(): Observable<any> {
    const configUrl = this.getConfigUrl();
    return this.http.get(configUrl).pipe(
      catchError(error => {
        console.error('Failed to load configuration:', error);
        return of(null);
      })
    );
  }
} 