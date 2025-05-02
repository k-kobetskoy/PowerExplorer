import { Injectable } from '@angular/core';

// Import the needed interfaces
interface GenericResponse {
  success: boolean;
  error?: string;
  errorDescription?: string;
}

interface AuthResponse extends GenericResponse {
  account?: AccountInfo;
}

interface TokenResponse extends GenericResponse {
  accessToken?: string;
}

interface EnvironmentsResponse extends GenericResponse {
  environments?: EnvironmentModel[];
  environment?: EnvironmentModel;
}

interface AccountInfo {
  homeAccountId: string;
  environment: string;
  tenantId: string;
  username: string;
  localAccountId: string;
  name?: string;
}

interface EnvironmentModel {
  id?: string;
  url: string;
  apiUrl: string;
  friendlyName: string;
  urlName: string;
  apiVersion?: string;
  isCustom?: boolean;
  scopes?: string[];
  [key: string]: any;
}

interface ElectronAuthAPI {
  login: (environmentUrl: EnvironmentModel) => Promise<AuthResponse>;
  getToken: (environmentUrl: EnvironmentModel) => Promise<TokenResponse>;
  logout: () => Promise<GenericResponse>;
  getActiveAccount: () => Promise<AccountInfo>;
  handleAuthRedirect: (params: any) => Promise<GenericResponse>;
  handleRedirect: (params: any) => Promise<GenericResponse>;
}

interface ElectronEnvironmentAPI {
  getModels: () => Promise<EnvironmentsResponse>;
  setActive: (model: EnvironmentModel) => Promise<GenericResponse>;
  getActive: () => Promise<EnvironmentsResponse>;
}

/**
 * Service to interact with Electron APIs from the Angular application.
 * Provides fallbacks for web browser environments.
 */
@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  /**
   * Indicates if the application is running in Electron
   */
  readonly isElectronApp: boolean;
  
  /**
   * Reference to the electron API object
   */
  readonly electron: any;

  constructor() {
    // Check if running in Electron environment
    this.isElectronApp = !!(window && window.electron);
    this.electron = this.isElectronApp ? window.electron : null;
  }

  /**
   * Get the platform (win32, darwin, linux)
   */
  get platform(): string | undefined {
    if (this.isElectronApp && this.electron) {
      return this.electron.platform;
    }
    return undefined;
  }

  /**
   * Open a URL in the user's default browser
   */
  openExternal(url: string): Promise<boolean> {
    if (this.isElectronApp && this.electron) {
      return this.electron.openExternal(url);
    } else {
      // Fallback for browser environment
      window.open(url, '_blank');
      return Promise.resolve(true);
    }
  }

  /**
   * Show an error dialog
   */
  showError(title: string, message: string): void {
    if (this.isElectronApp && this.electron) {
      this.electron.showError(title, message);
    } else {
      // Fallback for browser environment
      console.error(`${title}: ${message}`);
      alert(`${title}\n${message}`);
    }
  }

  /**
   * Send a message to the main process
   */
  send(channel: string, data?: any): void {
    if (this.isElectronApp && this.electron) {
      this.electron.send(channel, data);
    } else {
      console.warn(`Cannot send to channel ${channel} in web environment`);
    }
  }

  /**
   * Register a listener for messages from the main process
   */
  receive(channel: string, callback: (data: any) => void): void {
    if (this.isElectronApp && this.electron) {
      this.electron.receive(channel, callback);
    } else {
      console.warn(`Cannot listen to channel ${channel} in web environment`);
    }
  }

  /**
   * Get authentication-related functionality
   */
  get auth(): ElectronAuthAPI {
    if (this.isElectronApp && this.electron) {
      // Debug: Log available methods in electron.auth
      // Filter out any non-implemented methods like setEnvironmentUrl
      console.log('[ELECTRON-SERVICE] Available auth methods:', 
        this.electron.auth ? Object.keys(this.electron.auth).filter(method => 
          ['login', 'getToken', 'logout', 'getActiveAccount', 'handleAuthRedirect', 'handleRedirect'].includes(method)
        ) : 'auth object not available');
      
      // Add getActiveAccount method if it's not available in the electron API
      const getActiveAccount = (): Promise<AccountInfo> => {
        console.log('[ELECTRON-SERVICE] Calling auth.getActiveAccount');
        
        // First try the direct window method if available (more reliable)
        if (typeof window['getActiveAccount'] === 'function') {
          console.log('[ELECTRON-SERVICE] Using direct window.getActiveAccount');
          return window['getActiveAccount']();
        }
        
        // Then try through electron.auth if available
        if (this.electron.auth && typeof this.electron.auth.getActiveAccount === 'function') {
          console.log('[ELECTRON-SERVICE] Using electron.auth.getActiveAccount');
          return this.electron.auth.getActiveAccount();
        }
        
        // If not available, use a fallback (empty account or stored account)
        console.warn('[ELECTRON-SERVICE] getActiveAccount is not available in electron API');
        return Promise.resolve(null);
      };
      
      // Add handleRedirect for backward compatibility
      return {
        login: (environmentModel: EnvironmentModel): Promise<AuthResponse> => 
          this.electron.auth.login(environmentModel),
        
        getToken: (environmentModel: EnvironmentModel): Promise<TokenResponse> => 
          this.electron.auth.getToken(environmentModel),
        
        logout: (): Promise<GenericResponse> => 
          this.electron.auth.logout(),
        
        getActiveAccount: getActiveAccount,
        
        handleAuthRedirect: (params: any): Promise<GenericResponse> => 
          this.electron.auth.handleAuthRedirect ? 
          this.electron.auth.handleAuthRedirect(params) : 
          this.electron.auth.handleRedirect ? 
          this.electron.auth.handleRedirect(params) : 
          Promise.reject({ success: false, error: 'No redirect handler available' }),
        
        // Alias for backward compatibility
        handleRedirect: (params: any): Promise<GenericResponse> => 
          this.electron.auth.handleAuthRedirect ? 
          this.electron.auth.handleAuthRedirect(params) : 
          this.electron.auth.handleRedirect ? 
          this.electron.auth.handleRedirect(params) : 
          Promise.reject({ success: false, error: 'No redirect handler available' })
      };
    }

    // Fallback for web environment
    const notAvailableGeneric = (): Promise<GenericResponse> => 
      Promise.reject({ success: false, error: 'Not available in web environment' });
    
    const notAvailableAuth = (): Promise<AuthResponse> => 
      Promise.reject({ success: false, error: 'Not available in web environment' });
    
    const notAvailableToken = (): Promise<TokenResponse> => 
      Promise.reject({ success: false, error: 'Not available in web environment' });
    
    const notAvailableAccount = (): Promise<AccountInfo> => 
      Promise.reject('Not available in web environment');

    return {
      login: notAvailableAuth,
      getToken: notAvailableToken,
      logout: notAvailableGeneric,
      getActiveAccount: notAvailableAccount,
      handleAuthRedirect: notAvailableGeneric,
      handleRedirect: notAvailableGeneric
    };
  }

  /**
   * Get environment-related functionality
   */
  get environment(): ElectronEnvironmentAPI {
    if (this.isElectronApp && this.electron) {
      return {
        getModels: (): Promise<EnvironmentsResponse> => 
          this.electron.environment.getModels(),
        
        setActive: (model: EnvironmentModel): Promise<GenericResponse> => 
          this.electron.environment.setActive(model),
        
        getActive: (): Promise<EnvironmentsResponse> => 
          this.electron.environment.getActive()
      };
    }

    // Fallback for web environment
    const notAvailable = (): Promise<EnvironmentsResponse> => 
      Promise.reject({ success: false, error: 'Not available in web environment' });
    
    const notAvailableGeneric = (): Promise<GenericResponse> => 
      Promise.reject({ success: false, error: 'Not available in web environment' });

    return {
      getModels: notAvailable,
      setActive: notAvailableGeneric,
      getActive: notAvailable
    };
  }
} 