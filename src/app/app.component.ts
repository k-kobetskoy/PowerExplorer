import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ElectronService } from './services/electron.service';
import { ElectronAuthService } from './services/electron-auth.service';
import { ElectronConfigService } from './services/electron-config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {

  title = 'PowerExplorer';
  isIframe = false;
  
  constructor(
    private authService: AuthService,
    private electronService: ElectronService,
    private electronAuthService: ElectronAuthService,
    private electronConfigService: ElectronConfigService
  ) {
    this.isIframe = false;
    
    // Set the electron auth service in the auth service to avoid circular dependency
    if (this.electronService.isElectronApp) {
      this.authService.setElectronAuthService(this.electronAuthService);
      
      // Initialize Electron-specific configuration
      this.electronConfigService.initializeConfig();
    }
  }

  ngOnInit(): void {
    this.authService.init();
    
    // Notify Electron that the app is ready
    if (this.electronService.isElectronApp) {
      console.log('Running in Electron');
      this.electronService.send('app-ready');
    } else {
      console.log('Running in browser');
    }
  }
}