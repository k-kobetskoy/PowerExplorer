"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Authentication channels
const AUTH_LOGIN = 'login';
const AUTH_GET_TOKEN = 'getToken';
const AUTH_LOGOUT = 'logout';
// const AUTH_SET_ENVIRONMENT_URL = 'setEnvironmentUrl'; // Removing non-implemented method
const AUTH_GET_ACTIVE_ACCOUNT = 'getActiveAccount';
const AUTH_SET_ACTIVE_ACCOUNT = 'setActiveAccount';
const AUTH_HANDLE_REDIRECT = 'handleRedirect';
// Environment model channels
const ENV_SAVE_MODEL = 'saveEnvironmentModel';
const ENV_GET_MODELS = 'getEnvironmentModels';
const ENV_DELETE_MODEL = 'deleteEnvironmentModel';
const ENV_SET_ACTIVE = 'setActiveEnvironment';
const ENV_GET_ACTIVE = 'getActiveEnvironment';
// Auto-update channels
const UPDATE_CHECK = 'check-for-updates';
const UPDATE_DOWNLOAD = 'download-update';
const UPDATE_QUIT_INSTALL = 'quit-and-install';
// All channels in a single object
const IpcChannels = {
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
    UPDATE_CHECK,
    UPDATE_DOWNLOAD,
    UPDATE_QUIT_INSTALL,
};
// Expose IPC channel constants to renderer
electron_1.contextBridge.exposeInMainWorld('IPC_CHANNELS', {
    ...IpcChannels
});
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, ...args) => {
        // Validate the channel is one we've defined
        const validChannels = Object.values(IpcChannels);
        if (validChannels.includes(channel)) {
            return electron_1.ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
});
// Create the main electron API object
const electronAPI = {
    send: (channel, data) => {
        // whitelist channels
        const validChannels = ['app-ready'];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        const validChannels = ['deep-link', 'update-available', 'update-not-available', 'update-error', 'update-progress', 'update-downloaded'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            electron_1.ipcRenderer.on(channel, (_event, ...args) => func(...args));
        }
    },
    auth: {
        login: (environmentUrl, userConfig) => electron_1.ipcRenderer.invoke(IpcChannels.AUTH_LOGIN, environmentUrl, userConfig),
        getToken: (scopes, environmentUrl, userConfig) => electron_1.ipcRenderer.invoke(IpcChannels.AUTH_GET_TOKEN, scopes, environmentUrl, userConfig),
        logout: () => electron_1.ipcRenderer.invoke(IpcChannels.AUTH_LOGOUT),
        getActiveAccount: () => electron_1.ipcRenderer.invoke(IpcChannels.AUTH_GET_ACTIVE_ACCOUNT),
        handleAuthRedirect: (params) => electron_1.ipcRenderer.invoke(IpcChannels.AUTH_HANDLE_REDIRECT, params),
        handleRedirect: (params) => electron_1.ipcRenderer.invoke(IpcChannels.AUTH_HANDLE_REDIRECT, params)
    },
    environment: {
        saveModel: (environmentModel) => electron_1.ipcRenderer.invoke(IpcChannels.ENV_SAVE_MODEL, environmentModel),
        getModels: () => electron_1.ipcRenderer.invoke(IpcChannels.ENV_GET_MODELS),
        deleteModel: (environmentUrl) => electron_1.ipcRenderer.invoke(IpcChannels.ENV_DELETE_MODEL, environmentUrl),
        setActive: (environmentModel) => electron_1.ipcRenderer.invoke(IpcChannels.ENV_SET_ACTIVE, environmentModel),
        getActive: () => electron_1.ipcRenderer.invoke(IpcChannels.ENV_GET_ACTIVE)
    },
    updater: {
        checkForUpdates: () => electron_1.ipcRenderer.invoke(IpcChannels.UPDATE_CHECK),
        downloadUpdate: () => electron_1.ipcRenderer.invoke(IpcChannels.UPDATE_DOWNLOAD),
        quitAndInstall: () => electron_1.ipcRenderer.invoke(IpcChannels.UPDATE_QUIT_INSTALL),
        onUpdateAvailable: (callback) => {
            const listener = (_event, info) => callback(info);
            electron_1.ipcRenderer.on('update-available', listener);
            return () => { electron_1.ipcRenderer.removeListener('update-available', listener); };
        },
        onUpdateNotAvailable: (callback) => {
            const listener = (_event, info) => callback(info);
            electron_1.ipcRenderer.on('update-not-available', listener);
            return () => { electron_1.ipcRenderer.removeListener('update-not-available', listener); };
        },
        onUpdateError: (callback) => {
            const listener = (_event, error) => callback(error);
            electron_1.ipcRenderer.on('update-error', listener);
            return () => { electron_1.ipcRenderer.removeListener('update-error', listener); };
        },
        onUpdateProgress: (callback) => {
            const listener = (_event, progressObj) => callback(progressObj);
            electron_1.ipcRenderer.on('update-progress', listener);
            return () => { electron_1.ipcRenderer.removeListener('update-progress', listener); };
        },
        onUpdateDownloaded: (callback) => {
            const listener = (_event, info) => callback(info);
            electron_1.ipcRenderer.on('update-downloaded', listener);
            return () => { electron_1.ipcRenderer.removeListener('update-downloaded', listener); };
        }
    },
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
    isElectron: true
};
electron_1.contextBridge.exposeInMainWorld('electron', electronAPI);
//# sourceMappingURL=preload.js.map