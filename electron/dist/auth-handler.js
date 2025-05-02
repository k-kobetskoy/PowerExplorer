"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const msal_node_1 = require("@azure/msal-node");
const electron_store_1 = __importDefault(require("electron-store"));
const ipc_channels_1 = __importDefault(require("./ipc-channels"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_2 = require("electron");
// Custom protocol for deep linking
const APP_PROTOCOL = 'powerexplorer';
const DEEP_LINK_URL = `${APP_PROTOCOL}://auth`;
// Persistent cache plugin for MSAL
class PersistentCachePlugin {
    constructor() {
        // Use user data path for persistent storage
        this.cachePath = path.join(electron_2.app.getPath('userData'), 'msal-cache.json');
        console.log('[AUTH-HANDLER] MSAL cache path:', this.cachePath);
    }
    async beforeCacheAccess(cacheContext) {
        try {
            if (fs.existsSync(this.cachePath)) {
                const cacheData = await fs.promises.readFile(this.cachePath, 'utf-8');
                cacheContext.tokenCache.deserialize(cacheData);
                console.log('[AUTH-HANDLER] Loaded MSAL cache from disk');
            }
            else {
                console.log('[AUTH-HANDLER] No MSAL cache file exists yet');
            }
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error loading MSAL cache:', error);
        }
    }
    async afterCacheAccess(cacheContext) {
        if (cacheContext.cacheHasChanged) {
            try {
                const cacheData = cacheContext.tokenCache.serialize();
                await fs.promises.writeFile(this.cachePath, cacheData);
                console.log('[AUTH-HANDLER] Wrote MSAL cache to disk');
            }
            catch (error) {
                console.error('[AUTH-HANDLER] Error writing MSAL cache:', error);
            }
        }
    }
}
// This module handles Microsoft authentication in Electron
class AuthHandler {
    constructor(mainWindow) {
        this.authority = 'https://login.microsoftonline.com/common';
        this.clientId = '51f81489-12ee-4a9e-aaae-a2591f45987d';
        this.redirectUri = 'http://localhost';
        this.pendingAuthRequest = null;
        this.mainWindow = mainWindow;
        this.pca = null;
        this.store = new electron_store_1.default({ name: 'power-explorer-settings' });
        this.initializeWithActiveEnvironment();
        this.registerIpcHandlers();
    }
    async initializeWithActiveEnvironment() {
        try {
            // Get active environment from store
            const activeEnv = this.getActiveEnvironment();
            console.log('[AUTH-HANDLER: INIT] Active environment:', activeEnv);
            if (activeEnv) {
                this.initializeMsal();
                // Check if we have a valid token before attempting silent authentication
                const isValid = await this.checkTokenValidity();
                if (isValid) {
                    console.log('[AUTH-HANDLER: INIT] Token is valid, skipping authentication');
                    return; // Token is still valid, no need to authenticate
                }
                // Try silent authentication if there's an active account
                if (this.pca) {
                    try {
                        // Get account from store
                        const activeAccount = await this.getActiveAccount();
                        console.log('[AUTH-HANDLER: INIT] Active account:', activeAccount);
                        if (activeAccount) {
                            // Get environment-specific scopes
                            const scopes = [`${activeEnv.apiUrl}/user_impersonation`];
                            // Try silent token acquisition
                            if (scopes.length > 0) {
                                const silentRequest = {
                                    account: activeAccount,
                                    scopes: scopes,
                                    authority: this.authority
                                };
                                try {
                                    await this.pca.acquireTokenSilent(silentRequest);
                                    // Token acquired successfully, no need to do anything else
                                }
                                catch (silentError) {
                                    this.removeActiveEnvironment();
                                }
                            }
                        }
                    }
                    catch (error) {
                        // Failed to get accounts or silent auth, but that's okay
                        // User will need to log in explicitly
                    }
                }
            }
            else {
                // No active environment, just initialize MSAL with default config
                this.initializeMsal();
            }
        }
        catch (error) {
            // Fall back to default initialization
            this.initializeMsal();
        }
    }
    initializeMsal() {
        try {
            // Create persistent cache plugin
            const persistentCachePlugin = new PersistentCachePlugin();
            const msalConfig = {
                auth: {
                    clientId: this.clientId,
                    authority: this.authority
                },
                system: {
                    loggerOptions: {
                        loggerCallback: (level, message, containsPii) => {
                            console.log(`[MSAL-${level}] ${message}`);
                        },
                        piiLoggingEnabled: false,
                        logLevel: msal_node_1.LogLevel.Verbose,
                    },
                },
                cache: {
                    cachePlugin: persistentCachePlugin
                }
            };
            this.pca = new msal_node_1.PublicClientApplication(msalConfig);
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error initializing MSAL:', error);
        }
    }
    registerIpcHandlers() {
        // Handle authentication requests from the renderer process
        electron_1.ipcMain.handle(ipc_channels_1.default.AUTH_LOGIN, async (event, environmentModel) => {
            try {
                const result = await this.login(environmentModel);
                // Save the environment model with auth config
                this.updateStoredEnvironments(environmentModel);
                // Make sure to save the account immediately
                console.log('[AUTH-HANDLER: IPC-LOGIN] Setting active account after login:', result.account);
                this.storeActiveAccount(result.account);
                return { success: true, account: result.account, accessToken: result.accessToken };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error during login';
                return { success: false, error: errorMessage };
            }
        });
        // Handle token acquisition
        electron_1.ipcMain.handle(ipc_channels_1.default.AUTH_GET_TOKEN, async (event, environmentModel) => {
            try {
                const token = await this.getToken(environmentModel);
                return { success: true, accessToken: token };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error getting token';
                return { success: false, error: errorMessage };
            }
        });
        // Handle log out requests
        electron_1.ipcMain.handle(ipc_channels_1.default.AUTH_LOGOUT, async () => {
            try {
                await this.logout();
                return { success: true };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error during logout';
                return { success: false, error: errorMessage };
            }
        });
        // Handle get active account request
        electron_1.ipcMain.handle(ipc_channels_1.default.AUTH_GET_ACTIVE_ACCOUNT, async () => {
            console.log('[AUTH-HANDLER] Direct getActiveAccount handler called');
            try {
                const account = await this.getActiveAccount();
                console.log('[AUTH-HANDLER] Direct getActiveAccount result:', account ? 'Account found' : 'No account');
                return account;
            }
            catch (error) {
                console.error('[AUTH-HANDLER] Direct getActiveAccount error:', error);
                return null;
            }
        });
        // Handle set active account request
        electron_1.ipcMain.handle(ipc_channels_1.default.AUTH_SET_ACTIVE_ACCOUNT, async (event, account) => {
            try {
                this.storeActiveAccount(account);
                return { success: true };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error setting active account';
                return { success: false, error: errorMessage };
            }
        });
        // Handle get cached environments request
        electron_1.ipcMain.handle(ipc_channels_1.default.ENV_GET_MODELS, async () => {
            try {
                const environments = this.getEnvironmentModels();
                return { success: true, environments };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error getting cached environments';
                return { success: false, error: errorMessage };
            }
        });
        // Handle delete cached environment request
        electron_1.ipcMain.handle(ipc_channels_1.default.ENV_DELETE_MODEL, async (event, environmentModel) => {
            try {
                this.deleteEnvironmentModel(environmentModel);
                return { success: true };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting cached environment';
                return { success: false, error: errorMessage };
            }
        });
        electron_1.ipcMain.handle(ipc_channels_1.default.ENV_SET_ACTIVE, async (event, environmentModel) => {
            try {
                if (!environmentModel) {
                    return { success: false, error: 'No environment model provided' };
                }
                const result = await this.setActiveEnvironment(environmentModel);
                return { success: result };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error setting active environment';
                return { success: false, error: errorMessage };
            }
        });
        electron_1.ipcMain.handle(ipc_channels_1.default.ENV_GET_ACTIVE, async () => {
            try {
                const activeEnv = this.getActiveEnvironment();
                return { success: true, environment: activeEnv };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error getting active environment';
                return { success: false, error: errorMessage };
            }
        });
        // Add new handler for auth redirect from renderer
        electron_1.ipcMain.handle(ipc_channels_1.default.AUTH_HANDLE_REDIRECT, async (event, params) => {
            try {
                await this.handleAuthRedirect(params);
                return { success: true };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error handling redirect';
                return { success: false, error: errorMessage };
            }
        });
    }
    // Handle auth redirect when returning from browser
    async handleAuthRedirect(params) {
        console.log('[AUTH-HANDLER] Handling auth deep link or redirect');
        // Focus the main window - ensure it's visible and brought to front
        if (this.mainWindow) {
            if (this.mainWindow.isMinimized()) {
                this.mainWindow.restore();
            }
            this.mainWindow.focus();
            this.mainWindow.moveTop(); // Ensure window is on top of others
            // Send notification to the renderer
            this.mainWindow.webContents.send('app-returned-from-auth');
        }
        const code = params.code;
        const state = params.state;
        const error = params.error;
        const errorDescription = params.error_description;
        if (code || error) {
            console.log('[AUTH-HANDLER] Processing auth code or error');
            if (error || !this.pendingAuthRequest || !this.pca) {
                // Handle error case
                console.error('[AUTH-HANDLER] Auth redirect error:', error, errorDescription);
                if (this.pendingAuthRequest) {
                    this.pendingAuthRequest.reject(new Error(errorDescription || error || 'Authentication failed'));
                    this.pendingAuthRequest = null;
                }
                // Notify the renderer that auth failed
                this.mainWindow.webContents.send('auth-failed', { error, errorDescription });
                return;
            }
            if (code && this.pendingAuthRequest) {
                try {
                    // Exchange code for token
                    const authResult = await this.pca.acquireTokenByCode({
                        code,
                        scopes: [`${this.pendingAuthRequest.environmentModel.apiUrl}/user_impersonation`],
                        redirectUri: this.redirectUri,
                        authority: this.authority
                    });
                    console.log('[AUTH-HANDLER] Auth code exchange successful');
                    // Save the environment model
                    this.updateStoredEnvironments(this.pendingAuthRequest.environmentModel);
                    // Set the active account
                    this.storeActiveAccount(authResult.account);
                    // Notify the renderer that auth was successful
                    this.mainWindow.webContents.send('auth-success', { account: authResult.account });
                    // Resolve the pending promise
                    this.pendingAuthRequest.resolve(authResult);
                    this.pendingAuthRequest = null;
                }
                catch (error) {
                    console.error('[AUTH-HANDLER] Error exchanging auth code:', error);
                    if (this.pendingAuthRequest) {
                        this.pendingAuthRequest.reject(error);
                        this.pendingAuthRequest = null;
                    }
                    // Notify the renderer that auth failed
                    this.mainWindow.webContents.send('auth-failed', {
                        error: 'code_exchange_error',
                        errorDescription: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        }
        else {
            // This is just a deep link to bring the app to the foreground
            console.log('[AUTH-HANDLER] Deep link activation without auth params');
        }
    }
    async login(environmentModel) {
        const scopes = [`${environmentModel.apiUrl}/user_impersonation`];
        try {
            console.log('[AUTH-HANDLER] Starting login process with interactive token acquisition');
            // Create HTML templates for success and error pages with a button to go back to the app
            const successTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Complete</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f0f0f0;
            }
            .container {
              text-align: center;
              padding: 2rem;
              max-width: 450px;
            }
            h2 {
              color: #414141;
              margin-bottom: 1rem;
            }            
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Authentication Complete</h2>
          </div>
          
          <script>
            // Automatically redirect to the app after a short delay
            setTimeout(() => {
              window.location.href = "${DEEP_LINK_URL}";
            }, 500); 
          </script>
        </body>
        </html>
      `;
            const errorTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f0f0f0;
            }
            .container {
              text-align: center;
              padding: 2rem;
              max-width: 450px;
            }
            h2 {
              color: #d83b01;
              margin-bottom: 1rem;
            }
            p {
              margin-bottom: 1.5rem;
              color: #333;
              line-height: 1.5;
            }
            .error-details {
              font-size: 0.9rem;
              color: #666;
              margin-bottom: 1.5rem;
              padding: 10px;
              background-color: #f8f8f8;
              border-radius: 4px;
              border-left: 3px solid #d83b01;
              text-align: left;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Authentication Failed</h2>
            <p>There was a problem with the authentication process.</p>
            <div class="error-details" id="errorDetails"></div>
          </div>
          
          <script>
            // Get error from URL if available
            const urlParams = new URLSearchParams(window.location.search);
            const error = urlParams.get('error');
            const errorDesc = urlParams.get('error_description');
            if (error || errorDesc) {
              document.getElementById('errorDetails').textContent = errorDesc || error;
            } else {
              document.getElementById('errorDetails').style.display = 'none';
            }
            
            // Automatically redirect to the app after a short delay
            setTimeout(() => {
              window.location.href = "${DEEP_LINK_URL}";
            }, 500);
          </script>
        </body>
        </html>
      `;
            // Browser open function - use shell.openExternal
            const openBrowser = async (url) => {
                console.log('[AUTH-HANDLER: LOGIN] Opening browser with URL:', url);
                await electron_1.shell.openExternal(url);
            };
            // Create a promise that will be resolved when the auth redirect is handled
            const authPromise = new Promise((resolve, reject) => {
                this.pendingAuthRequest = {
                    environmentModel: {
                        ...environmentModel,
                    },
                    scopes: scopes,
                    resolve,
                    reject
                };
            });
            // Set timeout to reject the promise after 5 minutes
            const timeoutId = setTimeout(() => {
                if (this.pendingAuthRequest) {
                    this.pendingAuthRequest.reject(new Error('Authentication timed out'));
                    this.pendingAuthRequest = null;
                }
            }, 5 * 60 * 1000);
            // Start the login process
            const interactiveRequest = {
                scopes: scopes,
                openBrowser: openBrowser,
                redirectUri: this.redirectUri,
                authority: this.authority,
                successTemplate: successTemplate,
                errorTemplate: errorTemplate
            };
            try {
                const response = await this.pca.acquireTokenInteractive(interactiveRequest);
                clearTimeout(timeoutId);
                // Save the environment and account
                this.updateStoredEnvironments(environmentModel);
                this.storeActiveAccount(response.account);
                // Resolve the promise
                if (this.pendingAuthRequest) {
                    this.pendingAuthRequest.resolve(response);
                    this.pendingAuthRequest = null;
                }
                return response;
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error('[AUTH-HANDLER] Error during interactive login:', error);
                if (this.pendingAuthRequest) {
                    this.pendingAuthRequest.reject(error);
                    this.pendingAuthRequest = null;
                }
                throw error;
            }
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error during interactive login:', error);
            throw error;
        }
    }
    async getToken(environmentModel) {
        const scopes = [`${environmentModel.apiUrl}/user_impersonation`];
        // First check if we have a valid token if an account exists
        const activeAccount = await this.getActiveAccount();
        if (activeAccount) {
            try {
                // Try to silently acquire token
                const silentRequest = {
                    account: activeAccount,
                    scopes: scopes,
                    authority: this.authority
                };
                const response = await this.pca.acquireTokenSilent(silentRequest);
                console.log('[AUTH-HANDLER: GET-TOKEN] Acquired token silently:', response.accessToken);
                return response.accessToken;
            }
            catch (error) {
                // Continue with interactive authentication flow below
            }
        }
        // If we reach here, we need to do an interactive login
        try {
            const result = await this.login(environmentModel);
            // Store the account immediately after successful login
            console.log('[AUTH-HANDLER] Setting active account after login:', result.account);
            this.storeActiveAccount(result.account);
            this.updateStoredEnvironments(environmentModel);
            return result.accessToken;
        }
        catch (error) {
            throw error;
        }
    }
    async logout() {
        const activeAccount = await this.getActiveAccount();
        if (activeAccount) {
            try {
                await this.pca.getTokenCache().removeAccount(activeAccount);
                this.removeActiveAccount();
                this.removeActiveEnvironment();
            }
            catch (error) {
                throw error;
            }
        }
    }
    // Environment model methods
    updateStoredEnvironments(environmentModel) {
        if (!environmentModel || !environmentModel.url)
            return;
        try {
            const models = this.getEnvironmentModels();
            const existingIndex = models.findIndex(env => env.url === environmentModel.url);
            if (existingIndex >= 0) {
                models.splice(existingIndex, 1);
            }
            models.unshift(environmentModel);
            const MAX_ENVIRONMENTS = 6;
            if (models.length > MAX_ENVIRONMENTS) {
                models.splice(MAX_ENVIRONMENTS, models.length - MAX_ENVIRONMENTS);
            }
            this.store.set('environmentModels', models);
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error saving environment model:', error);
        }
    }
    getEnvironmentModels() {
        try {
            return this.store.get('environmentModels', []);
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error getting environment models:', error);
            return [];
        }
    }
    deleteEnvironmentModel(environmentModel) {
        if (!environmentModel)
            return;
        try {
            // Get existing models with explicit type cast
            const models = this.getEnvironmentModels();
            // Remove model with matching URL
            const updatedModels = models.filter(env => env.url !== environmentModel.url);
            // Save updated models
            this.store.set('environmentModels', updatedModels);
            // If active environment was deleted, set active to null
            const activeEnv = this.getActiveEnvironment();
            if (activeEnv && activeEnv.url === environmentModel.url) {
                this.store.delete('activeEnvironment');
            }
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error deleting environment model:', error);
        }
    }
    async getActiveAccount() {
        try {
            // First try to get the active account ID from store
            const activeAccountId = this.store.get('activeAccountId', null);
            console.log('[AUTH-HANDLER: GET-ACTIVE-ACCOUNT] Active account ID:', activeAccountId);
            if (!activeAccountId || !this.pca) {
                return null;
            }
            // Use the MSAL token cache to get all accounts
            const accounts = await this.pca.getTokenCache().getAllAccounts();
            // Find the account that matches the stored ID
            const msalAccount = accounts.find(account => account.homeAccountId === activeAccountId) || null;
            console.log('[AUTH-HANDLER: GET-ACTIVE-ACCOUNT] Active account:', msalAccount);
            // Create a clean version of the account for IPC transfer
            if (msalAccount) {
                const cleanAccount = {
                    homeAccountId: msalAccount.homeAccountId,
                    environment: msalAccount.environment,
                    tenantId: msalAccount.tenantId,
                    username: msalAccount.username,
                    localAccountId: msalAccount.localAccountId,
                    name: msalAccount.name
                };
                console.log('[AUTH-HANDLER: GET-ACTIVE-ACCOUNT] Clean account for IPC:', cleanAccount);
                return cleanAccount;
            }
            return null;
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error getting active account from cache:', error);
            return null;
        }
    }
    storeActiveAccount(account) {
        try {
            if (!account || !account.homeAccountId) {
                console.error('[AUTH-HANDLER: SET-ACTIVE-ACCOUNT] Invalid account:', account);
                return;
            }
            // Store just the account ID instead of the full object
            console.log('[AUTH-HANDLER: SET-ACTIVE-ACCOUNT] Storing account ID:', account.homeAccountId);
            this.store.set('activeAccountId', account.homeAccountId);
            // Force immediate save to disk
            if (typeof this.store.store === 'function') {
                console.log('[AUTH-HANDLER: SET-ACTIVE-ACCOUNT] Flushing store to disk');
                this.store.store();
            }
            // Create a clean account object for IPC transfer
            const cleanAccount = {
                homeAccountId: account.homeAccountId,
                environment: account.environment,
                tenantId: account.tenantId,
                username: account.username,
                localAccountId: account.localAccountId,
                name: account.name
            };
            // Emit account changed event to renderer process
            console.log('[AUTH-HANDLER: SET-ACTIVE-ACCOUNT] Sending account to renderer:', cleanAccount);
            this.mainWindow.webContents.send('account-changed', cleanAccount);
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error setting active account:', error);
        }
    }
    removeActiveAccount() {
        try {
            this.store.delete('activeAccountId');
            // Emit account changed event with null to renderer process
            this.mainWindow.webContents.send('account-changed', null);
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error removing active account:', error);
        }
    }
    async setActiveEnvironment(environmentModel) {
        if (!environmentModel)
            return false;
        try {
            const isTokenValid = await this.getToken(environmentModel);
            if (isTokenValid) {
                this.store.set('activeEnvironment', environmentModel);
                this.mainWindow.webContents.send('environment-changed', environmentModel);
                return true;
            }
            else {
                return false;
            }
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error setting active environment:', error);
            return false;
        }
    }
    removeActiveEnvironment() {
        try {
            this.store.delete('activeEnvironment');
            // Emit environment changed event with null to renderer process
            this.mainWindow.webContents.send('environment-changed', null);
        }
        catch (error) {
            console.error('[AUTH-HANDLER] Error removing active environment:', error);
        }
    }
    getActiveEnvironment() {
        try {
            return this.store.get('activeEnvironment', null);
        }
        catch (error) {
            return null;
        }
    }
    async checkTokenValidity() {
        try {
            if (!this.pca) {
                console.log('[AUTH-HANDLER: CHECK-TOKEN-VALIDITY] MSAL not initialized');
                return false;
            }
            const activeAccount = await this.getActiveAccount();
            if (!activeAccount) {
                console.log('[AUTH-HANDLER: CHECK-TOKEN-VALIDITY] No active account');
                return false;
            }
            const environmentModel = this.getActiveEnvironment();
            if (!environmentModel) {
                console.log('[AUTH-HANDLER: CHECK-TOKEN-VALIDITY] No active environment');
                return false;
            }
            // Get environment-specific scopes
            const scopes = [`${environmentModel.apiUrl}/user_impersonation`];
            // This will throw an error if token is expired or not found
            await this.pca.acquireTokenSilent({
                account: activeAccount,
                scopes: scopes,
                forceRefresh: false
            });
            console.log('[AUTH-HANDLER: CHECK-TOKEN-VALIDITY] Token is valid');
            // If we reach here, token is valid
            return true;
        }
        catch (error) {
            console.log('[AUTH-HANDLER: CHECK-TOKEN-VALIDITY] Token is invalid');
            return false;
        }
    }
}
exports.default = AuthHandler;
//# sourceMappingURL=auth-handler.js.map