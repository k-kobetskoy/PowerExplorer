import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthConfigService {

  constructor(private envService: EnvService) { }

  /**
   * Get the MSAL configuration for your app
   */
  getMsalConfig(): Observable<any> {
    // Combines both the window.config values and the configuration.json
    return this.envService.loadMsalConfig().pipe(
      map(config => {
        // Use the configuration.json values, but allow runtime overrides
        return {
          auth: {
            clientId: config.msal.auth.clientId,
            authority: this.envService.msalConfig.auth.authority,
            redirectUri: config.msal.auth.redirectUri,
            postLogoutRedirectUri: config.msal.auth.postLogoutRedirectUri,
            navigateToLoginRequestUrl: config.msal.auth.navigateToLoginRequestUrl
          },
          cache: config.msal.cache
        };
      })
    );
  }

  /**
   * Get protected resource configuration
   */
  getProtectedResourceMap(): Observable<Array<[string, string[]]>> {
    return this.envService.loadMsalConfig().pipe(
      map(config => config.interceptor.protectedResourceMap)
    );
  }
} 