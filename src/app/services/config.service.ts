import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private settings: any;
  private http: HttpClient;
  private isElectron: boolean = false;

  constructor(private readonly httpHandler: HttpBackend) {
    this.http = new HttpClient(httpHandler);
    // Check for Electron environment
    this.isElectron = window && window['electron'] !== undefined;
  }

  init(endpoint: string): Promise<boolean> {
    // If in Electron, modify the endpoint to use the Electron-specific config
    if (this.isElectron) {
      endpoint = 'assets/electron-configuration.json';
    }

    return new Promise<boolean>((resolve, reject) => {
      this.http.get(endpoint).pipe(map(result => result))
        .subscribe(value => {
          this.settings = value;
          
          // For Electron, make additional modifications to settings if needed
          if (this.isElectron) {
            this.adjustSettingsForElectron();
          }
          
          resolve(true);
        },
        (error) => {
          reject(error);
        });
    });
  }

  /**
   * Make Electron-specific adjustments to settings
   */
  private adjustSettingsForElectron(): void {
    // Make Electron-specific adjustments to settings if needed
    // The redirect URIs will be dynamically set during the auth process
    if (this.settings && this.settings.msal && this.settings.msal.auth) {
      console.log('[CONFIG] Adjusted Electron settings for MSAL');
    }
  }

  getSettings(key?: string | Array<string>): any {
    if (!key || (Array.isArray(key) && !key[0])) {
      return this.settings;
    }

    if (!Array.isArray(key)) {
      key = key.split('.');
    }

    let result = key.reduce((account: any, current: string) => account && account[current], this.settings);

    return result;
  }
}