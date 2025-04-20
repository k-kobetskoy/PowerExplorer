import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';

interface WindowConfig {
  config: {
    CLIENT_ID: string;
    AUTHORITY_URL: string;
    API_SCOPES: string;
    API_URI: string;
    REDIRECT_URI: string;
    POST_LOGOUT_REDIRECT_URI: string;
  };
}

interface MsalConfig {
  msal: {
    auth: {
      clientId: string;
      redirectUri: string;
      postLogoutRedirectUri: string;
      navigateToLoginRequestUrl: boolean;
    };
    cache: {
      cacheLocation: string;
      storeAuthStateInCookie: boolean;
    };
  };
  guard: {
    interactionType: string;
    authRequest: {
      scopes: string[];
    };
  };
  interceptor: {
    interactionType: string;
    protectedResourceMap: Array<[string, string[]]>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EnvService {
  private readonly window: WindowConfig;
  private configuration$: Observable<MsalConfig> | null = null;

  constructor(private http: HttpClient) {
    this.window = window as unknown as WindowConfig;
  }

  get production(): boolean {
    return environment.production;
  }

  get msalConfig(): any {
    if (environment.production && this.window.config) {
      return {
        auth: {
          clientId: this.window.config.CLIENT_ID || environment.msalConfig.auth.clientId,
          authority: this.window.config.AUTHORITY_URL || environment.msalConfig.auth.authority
        }
      };
    }
    return environment.msalConfig;
  }

  get apiConfig(): any {
    if (environment.production && this.window.config) {
      return {
        scopes: [this.window.config.API_SCOPES || environment.apiConfig.scopes[0]],
        uri: this.window.config.API_URI || environment.apiConfig.uri
      };
    }
    return environment.apiConfig;
  }

  /**
   * Load the MSAL configuration from JSON file
   */
  loadMsalConfig(): Observable<MsalConfig> {
    if (!this.configuration$) {
      this.configuration$ = this.http.get<MsalConfig>('assets/configuration.json').pipe(
        shareReplay(1),
        catchError(error => {
          console.error('Failed to load configuration', error);
          // Return a default configuration if load fails
          const defaultConfig: MsalConfig = {
            msal: {
              auth: {
                clientId: this.msalConfig.auth.clientId,
                redirectUri: this.window.config?.REDIRECT_URI || 'http://localhost:4200/',
                postLogoutRedirectUri: this.window.config?.POST_LOGOUT_REDIRECT_URI || 'http://localhost:4200/',
                navigateToLoginRequestUrl: true
              },
              cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: true
              }
            },
            guard: {
              interactionType: 'popup',
              authRequest: {
                scopes: []
              }
            },
            interceptor: {
              interactionType: 'popup',
              protectedResourceMap: [
                [this.apiConfig.uri.split('/Instances')[0] + '/', [this.apiConfig.scopes[0]]],
                ['https://graph.microsoft.com/v1.0/me', ['https://graph.microsoft.com/User.Read']]
              ]
            }
          };
          return of(defaultConfig);
        })
      );
    }
    return this.configuration$;
  }
} 