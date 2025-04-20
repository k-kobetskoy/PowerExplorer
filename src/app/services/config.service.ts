import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { EnvService } from './env.service';

interface MsalConfiguration {
  msal?: {
    auth?: {
      clientId?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  interceptor?: {
    protectedResourceMap?: Array<any>;
    [key: string]: any;
  };
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private settings: any;
  private http: HttpClient;

  constructor(
    private readonly httpHandler: HttpBackend,
    private envService: EnvService
  ) {
    this.http = new HttpClient(httpHandler);
  }

  init(endpoint: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.http.get<MsalConfiguration>(endpoint).pipe(
        map(result => {
          // Override with environment variables in production if available
          if (this.envService.production) {
            const config = this.envService.msalConfig;
            const api = this.envService.apiConfig;
            
            // Override MSAL auth settings
            if (result.msal?.auth) {
              result.msal.auth.clientId = config.auth.clientId;
            }
            
            // Override protected resource map
            if (result.interceptor?.protectedResourceMap?.length > 0) {
              // Find and update the API endpoint
              for (let i = 0; i < result.interceptor.protectedResourceMap.length; i++) {
                const entry = result.interceptor.protectedResourceMap[i];
                if (Array.isArray(entry) && entry.length >= 2 && 
                    entry[0].includes('globaldisco.crm.dynamics.com')) {
                  // Replace with new API URI and scopes
                  const baseUri = api.uri.split('/Instances')[0];
                  entry[0] = baseUri + "/";
                  entry[1] = [api.scopes[0]];
                }
              }
            }
          }
          
          return result;
        })
      )
      .subscribe({
        next: value => {
          this.settings = value;
          resolve(true);
        },
        error: error => {
          reject(error);
        }
      });
    });
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