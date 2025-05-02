/**
 * Constants for IPC channel names used between Electron main and renderer processes
 */

// Authentication channels
export const AUTH_LOGIN = 'login';
export const AUTH_GET_TOKEN = 'getToken';
export const AUTH_LOGOUT = 'logout';
// export const AUTH_SET_ENVIRONMENT_URL = 'setEnvironmentUrl'; // Removing non-implemented method
export const AUTH_GET_ACTIVE_ACCOUNT = 'getActiveAccount';
export const AUTH_SET_ACTIVE_ACCOUNT = 'setActiveAccount';
export const AUTH_HANDLE_REDIRECT = 'handleRedirect';
// Environment model channels
export const ENV_SAVE_MODEL = 'saveEnvironmentModel';
export const ENV_GET_MODELS = 'getEnvironmentModels';
export const ENV_DELETE_MODEL = 'deleteEnvironmentModel';
export const ENV_SET_ACTIVE = 'setActiveEnvironment';
export const ENV_GET_ACTIVE = 'getActiveEnvironment';

// Create a type for all channel names
export type IpcChannel = 
  | typeof AUTH_LOGIN
  | typeof AUTH_GET_TOKEN
  | typeof AUTH_LOGOUT
  // | typeof AUTH_SET_ENVIRONMENT_URL // Removing non-implemented method
  | typeof AUTH_GET_ACTIVE_ACCOUNT
  | typeof AUTH_SET_ACTIVE_ACCOUNT
  | typeof ENV_SAVE_MODEL
  | typeof ENV_GET_MODELS
  | typeof ENV_DELETE_MODEL
  | typeof ENV_SET_ACTIVE
  | typeof ENV_GET_ACTIVE
  | typeof AUTH_HANDLE_REDIRECT;

// Export all channels as a single object for CommonJS compatibility
export default {
  AUTH_LOGIN,
  AUTH_GET_TOKEN,
  AUTH_GET_ACTIVE_ACCOUNT,
  AUTH_SET_ACTIVE_ACCOUNT,
  AUTH_LOGOUT,
  // AUTH_SET_ENVIRONMENT_URL, // Removing non-implemented method
  AUTH_HANDLE_REDIRECT,
  ENV_SAVE_MODEL,
  ENV_GET_MODELS,
  ENV_DELETE_MODEL,
  ENV_SET_ACTIVE,
  ENV_GET_ACTIVE,
}; 