import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { LoadingIndicationService } from './services/loading-indication.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loadingService: LoadingIndicationService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip loading indicator for specific requests if needed
    if (request.headers.get('skip-loader')) {
      return next.handle(request);
    }

    this.loadingService.onRequestStarted();
    
    return next.handle(request).pipe(
      finalize(() => {
        this.loadingService.onRequestFinished();
      })
    );
  }
} 