import { Component, OnInit } from '@angular/core';
import { DesktopAuthService } from './services/desktop-auth.service';
import { ElectronService } from './services/electron.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {

  title = 'PowerExplorer';
  isIframe = false;

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
    }
  }
}