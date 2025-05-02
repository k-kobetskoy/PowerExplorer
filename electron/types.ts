/**
 * Common types for the Electron part of the application
 */

// Environment model type
export interface EnvironmentModel {
  url: string;
  apiUrl: string;
  friendlyName: string;
  urlName: string;
  scopes?: string[];
}

// Authentication configuration
export interface AuthConfig {
  authority?: string;
  clientId?: string;
  scopes?: string[];
}

// User configuration for authentication
export interface UserConfig {
  authority?: string;
  clientId?: string;
  scopes?: string[];
}

// Authentication response
export interface AuthResponse {
  success: boolean;
  account?: any;
  accessToken?: string;
  error?: string;
}

// Token response
export interface TokenResponse {
  success: boolean;
  accessToken?: string;
  error?: string;
}

// Environments response
export interface EnvironmentsResponse {
  success: boolean;
  environments?: EnvironmentModel[];
  environment?: EnvironmentModel;
  error?: string;
}

// Environment response
export interface EnvironmentResponse {
  success: boolean;
  environment?: EnvironmentModel;
  error?: string;
}

// Generic success/error response
export interface GenericResponse {
  success: boolean;
  error?: string;
} 