import { AccountInfo } from "@azure/msal-browser";
import { EnvironmentModel } from "../models/environment-model";
import { AuthResponse, EnvironmentResponse, EnvironmentsResponse, GenericResponse, TokenResponse } from "electron/types";
export interface ElectronAuthAPI {
  login: (environmentModel: EnvironmentModel) => Promise<AuthResponse>;
  getToken: (environmentModel: EnvironmentModel) => Promise<TokenResponse>;
  logout: () => Promise<GenericResponse>;
  getActiveAccount: () => Promise<AccountInfo | null>;
  handleRedirect: (params: Record<string, string>) => Promise<GenericResponse>;
}

export interface ElectronEnvironmentAPI {
  getModels: () => Promise<EnvironmentsResponse>;
  deleteModel: (environmentModel: EnvironmentModel) => Promise<GenericResponse>;
  setActive: (environmentModel: EnvironmentModel) => Promise<GenericResponse>;
  getActive: () => Promise<EnvironmentResponse>;
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseName?: string;
  releaseNotes?: string;
}

export interface ProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface ElectronUpdaterAPI {
  // Core methods
  checkForUpdates: () => Promise<any>;
  downloadUpdate: () => Promise<any>;
  quitAndInstall: () => Promise<void>;
  
  // Event handlers - not all needed for silent updates
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateError: (callback: (error: string) => void) => () => void;
  onUpdateProgress: (callback: (progressObj: ProgressInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
}

export interface ElectronAPI {
  send: (channel: string, data?: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  auth: ElectronAuthAPI;
  environment: ElectronEnvironmentAPI;
  updater: ElectronUpdaterAPI;
  openExternal: (url: string) => Promise<boolean>;
  isElectron: boolean;
}

export interface ElectronInvokeAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
} 