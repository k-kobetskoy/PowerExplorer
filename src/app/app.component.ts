import { Component, OnInit, OnDestroy } from '@angular/core';
import { DesktopAuthService } from './services/desktop-auth.service';
import { ElectronService } from './services/electron.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'PowerExplorer';
  isIframe = false;
  
  // Update notification properties
  showUpdateNotification = false;
  updateInfo: any = null;
  
  // Cleanup functions for update event listeners
  private updateAvailableUnsubscribe?: () => void;
  private updateErrorUnsubscribe?: () => void;

  constructor(
    private electronAuthService: DesktopAuthService,
    private electronService: ElectronService,    
  ) {
    // Check if we're running in an iframe
    this.isIframe = window !== window.parent && !window.opener;

    if (this.electronService.isElectronApp) {
      console.log('[APP] Running in Electron');
    } else {
      console.log('[APP] Not running in Electron');
    }
  }

  ngOnInit(): void {
    this.electronAuthService.updateActiveAccount();
    this.electronAuthService.updateActiveEnvironment();

    if (this.electronService.isElectronApp) {
      this.electronService.send('app-ready');
      
      // Check for updates
      this.setupAutoUpdateListeners();
    }
  }
  
  ngOnDestroy(): void {
    // Clean up event listeners
    if (this.updateAvailableUnsubscribe) {
      this.updateAvailableUnsubscribe();
    }
    
    if (this.updateErrorUnsubscribe) {
      this.updateErrorUnsubscribe();
    }
  }
  
  /**
   * Setup auto-update event listeners
   */
  private setupAutoUpdateListeners(): void {
    // For silent updates, we only need to listen for 'update-available'
    this.updateAvailableUnsubscribe = this.electronService.updater.onUpdateAvailable((info) => {
      console.log('[APP] Update available:', info);
      this.updateInfo = info;
      this.showUpdateNotification = true;
    });
    
    // Listen for errors (for logging purposes)
    this.updateErrorUnsubscribe = this.electronService.updater.onUpdateError((error) => {
      console.error('[APP] Update error:', error);
    });
    
    // Trigger a check for updates
    this.electronService.updater.checkForUpdates()
      .catch(err => console.error('[APP] Error checking for updates:', err));
  }
  
  /**
   * Dismiss the update notification
   */
  dismissUpdateNotification(): void {
    this.showUpdateNotification = false;
  }
}