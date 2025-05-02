import { Injectable, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DesktopAuthService } from './desktop-auth.service';
import { ACTIVE_ENVIRONMENT_MODEL } from '../models/tokens';
import { EnvironmentModel } from '../models/environment-model';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class ElectronHttpInterceptor implements HttpInterceptor {
  
  constructor(@Inject(ACTIVE_ENVIRONMENT_MODEL) private activeEnvironmentModel: BehaviorSubject<EnvironmentModel>, private electronAuthService: DesktopAuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip non-secure endpoints or non-API endpoints
    if (!req.url.startsWith('https://') || 
        (!req.url.includes('/api/data/') && 
         !req.url.includes('/api/crm/'))) {
      return next.handle(req);
    }
        
    // Get token from Electron auth service
    return this.electronAuthService.getToken(this.activeEnvironmentModel.value).pipe(
      switchMap(token => {
        if (!token) {
          console.log('[ELECTRON-HTTP-INTERCEPTOR] No token available, proceeding without authentication');
          return next.handle(req);
        }
        
        console.log('[ELECTRON-HTTP-INTERCEPTOR] Adding bearer token to request');
        
        // Clone the request and add the authorization header
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        
        return next.handle(authReq);
      })
    );
  }
} 