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

export interface ElectronAPI {
  send: (channel: string, data?: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  auth: ElectronAuthAPI;
  environment: ElectronEnvironmentAPI;
  openExternal: (url: string) => Promise<boolean>;
  isElectron: boolean;
}

export interface ElectronInvokeAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
} 