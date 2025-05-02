import { Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';

// Import the ElectronAPI interface
import { ElectronAPI } from '../types/electron.d';

@Injectable({
  providedIn: 'root'
})
export class ExternalLinkService {
  constructor(@Inject(DOCUMENT) private document: Document) {}

  /**
   * Opens a URL in the default browser
   * In Electron, uses shell.openExternal
   * In browser, uses window.open with _blank target
   */
  openExternalLink(url: string): void {
    // Make sure the URL is valid
    if (!url) return;

    // Check if we're in Electron
    if (window.electron?.isElectron) {
      console.log('Opening external URL using Electron:', url);
      window.electron.openExternal(url).catch(err => {
        console.error('Failed to open external URL:', err);
      });
    } else {
      // Standard browser behavior - open in new tab/window
      console.log('Opening external URL in browser:', url);
      const newWindow = this.document.defaultView?.open(url, '_blank');
      
      // Add security attributes
      if (newWindow) {
        newWindow.opener = null;
        newWindow.focus();
      }
    }
  }
} 