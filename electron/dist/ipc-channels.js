"use strict";
/**
 * Constants for IPC channel names used between Electron main and renderer processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV_GET_ACTIVE = exports.ENV_SET_ACTIVE = exports.ENV_DELETE_MODEL = exports.ENV_GET_MODELS = exports.ENV_SAVE_MODEL = exports.AUTH_HANDLE_REDIRECT = exports.AUTH_SET_ACTIVE_ACCOUNT = exports.AUTH_GET_ACTIVE_ACCOUNT = exports.AUTH_LOGOUT = exports.AUTH_GET_TOKEN = exports.AUTH_LOGIN = void 0;
// Authentication channels
exports.AUTH_LOGIN = 'login';
exports.AUTH_GET_TOKEN = 'getToken';
exports.AUTH_LOGOUT = 'logout';
// export const AUTH_SET_ENVIRONMENT_URL = 'setEnvironmentUrl'; // Removing non-implemented method
exports.AUTH_GET_ACTIVE_ACCOUNT = 'getActiveAccount';
exports.AUTH_SET_ACTIVE_ACCOUNT = 'setActiveAccount';
exports.AUTH_HANDLE_REDIRECT = 'handleRedirect';
// Environment model channels
exports.ENV_SAVE_MODEL = 'saveEnvironmentModel';
exports.ENV_GET_MODELS = 'getEnvironmentModels';
exports.ENV_DELETE_MODEL = 'deleteEnvironmentModel';
exports.ENV_SET_ACTIVE = 'setActiveEnvironment';
exports.ENV_GET_ACTIVE = 'getActiveEnvironment';
// Export all channels as a single object for CommonJS compatibility
exports.default = {
    AUTH_LOGIN: exports.AUTH_LOGIN,
    AUTH_GET_TOKEN: exports.AUTH_GET_TOKEN,
    AUTH_GET_ACTIVE_ACCOUNT: exports.AUTH_GET_ACTIVE_ACCOUNT,
    AUTH_SET_ACTIVE_ACCOUNT: exports.AUTH_SET_ACTIVE_ACCOUNT,
    AUTH_LOGOUT: exports.AUTH_LOGOUT,
    // AUTH_SET_ENVIRONMENT_URL, // Removing non-implemented method
    AUTH_HANDLE_REDIRECT: exports.AUTH_HANDLE_REDIRECT,
    ENV_SAVE_MODEL: exports.ENV_SAVE_MODEL,
    ENV_GET_MODELS: exports.ENV_GET_MODELS,
    ENV_DELETE_MODEL: exports.ENV_DELETE_MODEL,
    ENV_SET_ACTIVE: exports.ENV_SET_ACTIVE,
    ENV_GET_ACTIVE: exports.ENV_GET_ACTIVE,
};
//# sourceMappingURL=ipc-channels.js.map