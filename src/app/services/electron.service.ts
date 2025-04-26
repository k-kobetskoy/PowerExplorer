import { Injectable } from '@angular/core';

interface ElectronAuthAPI {
  login: (environmentUrl?: string, userConfig?: any) => Promise<any>;
  getToken: (scopes?: string[], environmentUrl?: string, userConfig?: any) => Promise<any>;
  logout: () => Promise<any>;
  setEnvironmentUrl: (environmentUrl: string) => Promise<any>;
}

interface ElectronAPI {
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  auth: ElectronAuthAPI;
  isElectron: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  private _electron: ElectronAPI | null = null;
  
  constructor() {
    // Retrieve the electron API from the preload script
    const window = this.getWindow();
    if (window.electron) {
      this._electron = window.electron as ElectronAPI;
    }
  }

  get isElectronApp(): boolean {
    return this._electron !== null && this._electron.isElectron === true;
  }

  /**
   * Send a message to the main Electron process
   */
  send(channel: string, data?: any): void {
    if (this.isElectronApp) {
      this._electron!.send(channel, data);
    } else {
      console.log('Not running in Electron, cannot send:', channel, data);
    }
  }

  /**
   * Receive messages from the main Electron process
   */
  receive(channel: string, func: (...args: any[]) => void): void {
    if (this.isElectronApp) {
      this._electron!.receive(channel, func);
    } else {
      console.log('Not running in Electron, cannot receive from:', channel);
    }
  }

  /**
   * Access to authentication API
   */
  get auth(): ElectronAuthAPI {
    if (this.isElectronApp && this._electron!.auth) {
      return this._electron!.auth;
    }
    
    // Return dummy implementation for non-Electron environments
    return {
      login: (environmentUrl?: string, userConfig?: any) => Promise.resolve({ success: false, error: 'Not running in Electron' }),
      getToken: (scopes?: string[], environmentUrl?: string, userConfig?: any) => Promise.resolve({ success: false, error: 'Not running in Electron' }),
      logout: () => Promise.resolve({ success: false, error: 'Not running in Electron' }),
      setEnvironmentUrl: (environmentUrl: string) => Promise.resolve({ success: false, error: 'Not running in Electron' })
    };
  }

  /**
   * Helper method to access window safely
   */
  private getWindow(): any {
    return window;
  }
} 