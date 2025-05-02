import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DesktopAuthService } from 'src/app/services/desktop-auth.service';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="auth-callback-container">
      <div class="spinner"></div>
      <h2>Completing authentication...</h2>
      <p>Please wait while we complete the authentication process.</p>
    </div>
  `,
  styles: [`
    .auth-callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #0078d4;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 1.5rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: DesktopAuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Extract query parameters from the URL
    this.route.queryParams.subscribe(params => {
      console.log('[AUTH-CALLBACK] Received callback with params:', params);
      
      // Convert params to a Record<string, string>
      const paramsRecord: Record<string, string> = {};
      Object.keys(params).forEach(key => {
        paramsRecord[key] = params[key];
      });
      
      // Handle the auth redirect
      this.authService.handleAuthRedirect(paramsRecord).subscribe(
        success => {
          console.log('[AUTH-CALLBACK] Auth redirect handled, success:', success);
          // Navigate to home page after handling the redirect
          this.router.navigate(['/']);
        },
        error => {
          console.error('[AUTH-CALLBACK] Error handling auth redirect:', error);
          this.notificationService.showError('Authentication failed. Please try again.');
          this.router.navigate(['/']);
        }
      );
    });
  }
} 