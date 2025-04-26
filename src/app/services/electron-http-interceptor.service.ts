import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ElectronAuthService } from './electron-auth.service';

@Injectable()
export class ElectronHttpInterceptor implements HttpInterceptor {
  
  constructor(private electronAuthService: ElectronAuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip non-secure endpoints or non-API endpoints
    if (!req.url.startsWith('https://') || 
        (!req.url.includes('/api/data/') && 
         !req.url.includes('/api/crm/'))) {
      return next.handle(req);
    }
    
    console.log('[ELECTRON-HTTP-INTERCEPTOR] Intercepting request to:', req.url);
    
    // Get token from Electron auth service
    return this.electronAuthService.getCurrentToken().pipe(
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