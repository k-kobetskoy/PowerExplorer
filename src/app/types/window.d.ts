/**
 * Global window augmentation for Electron API
 * This file provides TypeScript type definitions for the electron object
 * that's attached to the window in Electron environments
 */

import { ElectronAPI, ElectronInvokeAPI } from './electron.d';

// Augment the global Window interface
declare global {
  interface Window {
    electron: ElectronAPI;
    electronAPI: ElectronInvokeAPI;
    IPC_CHANNELS: any;
  }
}

// This empty export is needed to make this a module
export {}; 