import { BrowserWindow, ipcMain, shell } from 'electron';
import { PublicClientApplication, LogLevel, AuthenticationResult, SilentFlowRequest, Configuration, AccountInfo, ICachePlugin } from '@azure/msal-node';
import Store from 'electron-store';
import IpcChannels from './ipc-channels';
import { EnvironmentModel, AuthResponse, TokenResponse, EnvironmentsResponse, GenericResponse } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Custom protocol for deep linking
const APP_PROTOCOL = 'powerexplorer';
const DEEP_LINK_URL = `${APP_PROTOCOL}://auth`;

// Persistent cache plugin for MSAL
class PersistentCachePlugin implements ICachePlugin {
    private cachePath: string;

    constructor() {
        // Use user data path for persistent storage
        this.cachePath = path.join(app.getPath('userData'), 'msal-cache.json');
        console.log('[AUTH-HANDLER] MSAL cache path:', this.cachePath);
    }

    async beforeCacheAccess(cacheContext: any): Promise<void> {
        try {
            if (fs.existsSync(this.cachePath)) {
                const cacheData = await fs.promises.readFile(this.cachePath, 'utf-8');
                cacheContext.tokenCache.deserialize(cacheData);
                console.log('[AUTH-HANDLER] Loaded MSAL cache from disk');
            } else {
                console.log('[AUTH-HANDLER] No MSAL cache file exists yet');
            }
        } catch (error) {
            console.error('[AUTH-HANDLER] Error loading MSAL cache:', error);
        }
    }

    async afterCacheAccess(cacheContext: any): Promise<void> {
        if (cacheContext.cacheHasChanged) {
            try {
                const cacheData = cacheContext.tokenCache.serialize();
                await fs.promises.writeFile(this.cachePath, cacheData);
                console.log('[AUTH-HANDLER] Wrote MSAL cache to disk');
            } catch (error) {
                console.error('[AUTH-HANDLER] Error writing MSAL cache:', error);
            }
        }
    }
}

interface InteractiveRequest {
    scopes: string[];
    openBrowser: (url: string) => Promise<void>;
    successTemplate?: string;
    errorTemplate?: string;
    redirectUri: string;
    authority?: string;
}

// This module handles Microsoft authentication in Electron
class AuthHandler {
    private mainWindow: BrowserWindow;
    private pca: PublicClientApplication | null;
    private store: Store;
    private authority: string = 'https://login.microsoftonline.com/common';
    private clientId: string = '51f81489-12ee-4a9e-aaae-a2591f45987d';
    private redirectUri: string = 'http://localhost';
    private pendingAuthRequest: {
        environmentModel: EnvironmentModel;
        resolve: (value: AuthenticationResult) => void;
        reject: (reason: any) => void;
    } | null = null;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        this.pca = null;
        this.store = new Store({ name: 'power-explorer-settings' });

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
                                const silentRequest: SilentFlowRequest = {
                                    account: activeAccount,
                                    scopes: scopes,
                                    authority: this.authority
                                };

                                try {
                                    await this.pca.acquireTokenSilent(silentRequest);
                                    // Token acquired successfully, no need to do anything else
                                } catch (silentError) {
                                    this.removeActiveEnvironment();
                                }
                            }
                        }
                    } catch (error) {
                        // Failed to get accounts or silent auth, but that's okay
                        // User will need to log in explicitly
                    }
                }
            } else {
                // No active environment, just initialize MSAL with default config
                this.initializeMsal();
            }
        } catch (error) {
            // Fall back to default initialization
            this.initializeMsal();
        }
    }

    initializeMsal() {
        try {
            // Create persistent cache plugin
            const persistentCachePlugin = new PersistentCachePlugin();
            
            const msalConfig: Configuration = {
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
                        logLevel: LogLevel.Verbose,
                    },
                },
                cache: {
                    cachePlugin: persistentCachePlugin
                }
            };

            this.pca = new PublicClientApplication(msalConfig);
        } catch (error) {
            console.error('[AUTH-HANDLER] Error initializing MSAL:', error);
        }
    }

    registerIpcHandlers() {
        // Handle authentication requests from the renderer process
        ipcMain.handle(IpcChannels.AUTH_LOGIN, async (event, environmentModel: EnvironmentModel): Promise<AuthResponse> => {
            try {
                const result = await this.login(environmentModel);

                // Save the environment model with auth config
                this.updateStoredEnvironments(environmentModel);

                // Make sure to save the account immediately
                console.log('[AUTH-HANDLER: IPC-LOGIN] Setting active account after login:', result.account);
                this.setActiveAccount(result.account);

                return { success: true, account: result.account, accessToken: result.accessToken };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error during login';
                return { success: false, error: errorMessage };
            }
        });

        // Handle token acquisition
        ipcMain.handle(IpcChannels.AUTH_GET_TOKEN, async (event, environmentModel: EnvironmentModel): Promise<TokenResponse> => {
            try {
                const token = await this.getToken(environmentModel);
                return { success: true, accessToken: token };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error getting token';
                return { success: false, error: errorMessage };
            }
        });

        // Handle log out requests
        ipcMain.handle(IpcChannels.AUTH_LOGOUT, async (): Promise<GenericResponse> => {
            try {
                await this.logout();
                return { success: true };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error during logout';
                return { success: false, error: errorMessage };
            }
        });

        // Handle get active account request
        ipcMain.handle(IpcChannels.AUTH_GET_ACTIVE_ACCOUNT, async (): Promise<AccountInfo | null> => {
            try {
                return await this.getActiveAccount();
            } catch (error) {
                return null;
            }
        });

        // Handle set active account request
        ipcMain.handle(IpcChannels.AUTH_SET_ACTIVE_ACCOUNT, async (event, account: AccountInfo): Promise<GenericResponse> => {
            try {
                this.setActiveAccount(account);
                return { success: true };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error setting active account';
                return { success: false, error: errorMessage };
            }
        });

        // Handle get cached environments request
        ipcMain.handle(IpcChannels.ENV_GET_MODELS, async (): Promise<EnvironmentsResponse> => {
            try {
                const environments = this.getEnvironmentModels();
                return { success: true, environments };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error getting cached environments';
                return { success: false, error: errorMessage };
            }
        });

        // Handle delete cached environment request
        ipcMain.handle(IpcChannels.ENV_DELETE_MODEL, async (event, environmentModel: EnvironmentModel): Promise<GenericResponse> => {
            try {
                this.deleteEnvironmentModel(environmentModel);
                return { success: true };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting cached environment';
                return { success: false, error: errorMessage };
            }
        });

        ipcMain.handle(IpcChannels.ENV_SET_ACTIVE, async (event, environmentModel: EnvironmentModel): Promise<GenericResponse> => {
            try {
                if (!environmentModel) {
                    return { success: false, error: 'No environment model provided' };
                }

                this.setActiveEnvironment(environmentModel);
                return { success: true };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error setting active environment';
                return { success: false, error: errorMessage };
            }
        });

        ipcMain.handle(IpcChannels.ENV_GET_ACTIVE, async (): Promise<EnvironmentsResponse> => {
            try {
                const activeEnv = this.getActiveEnvironment();
                return { success: true, environment: activeEnv };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error getting active environment';
                return { success: false, error: errorMessage };
            }
        });

        // Add new handler for auth redirect from renderer
        ipcMain.handle(IpcChannels.AUTH_HANDLE_REDIRECT, async (event, params: Record<string, string>): Promise<GenericResponse> => {
            try {
                await this.handleAuthRedirect(params);
                return { success: true };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error handling redirect';
                return { success: false, error: errorMessage };
            }
        });
    }

    // Handle auth redirect when returning from browser
    async handleAuthRedirect(params: Record<string, string>): Promise<void> {
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
                        scopes: this.pendingAuthRequest.environmentModel.scopes || 
                                [`${this.pendingAuthRequest.environmentModel.apiUrl}/user_impersonation`],
                        redirectUri: this.redirectUri,
                        authority: this.authority
                    });
                    
                    console.log('[AUTH-HANDLER] Auth code exchange successful');
                    
                    // Save the environment model
                    this.updateStoredEnvironments(this.pendingAuthRequest.environmentModel);
                    
                    // Set the active account
                    this.setActiveAccount(authResult.account);
                    
                    // Notify the renderer that auth was successful
                    this.mainWindow.webContents.send('auth-success', { account: authResult.account });
                    
                    // Resolve the pending promise
                    this.pendingAuthRequest.resolve(authResult);
                    this.pendingAuthRequest = null;
                    
                } catch (error) {
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
        } else {
            // This is just a deep link to bring the app to the foreground
            console.log('[AUTH-HANDLER] Deep link activation without auth params');
        }
    }

    async login(environmentModel: EnvironmentModel): Promise<AuthenticationResult> {
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
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              max-width: 450px;
            }
            h2 {
              color: #0078d4;
              margin-bottom: 1rem;
            }
            p {
              margin-bottom: 1.5rem;
              color: #333;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Authentication Complete</h2>
            <p>Authentication successful!</p>
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
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
            const openBrowser = async (url: string) => {
                console.log('[AUTH-HANDLER: LOGIN] Opening browser with URL:', url);
                await shell.openExternal(url);
            };

            // Create a promise that will be resolved when the auth redirect is handled
            const authPromise = new Promise<AuthenticationResult>((resolve, reject) => {
                this.pendingAuthRequest = {
                    environmentModel: {
                        ...environmentModel,
                        scopes: scopes
                    },
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
            const interactiveRequest: InteractiveRequest = {
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
                this.setActiveAccount(response.account);
                
                // Resolve the promise
                if (this.pendingAuthRequest) {
                    this.pendingAuthRequest.resolve(response);
                    this.pendingAuthRequest = null;
                }
                
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                console.error('[AUTH-HANDLER] Error during interactive login:', error);
                
                if (this.pendingAuthRequest) {
                    this.pendingAuthRequest.reject(error);
                    this.pendingAuthRequest = null;
                }
                
                throw error;
            }
        } catch (error) {
            console.error('[AUTH-HANDLER] Error during interactive login:', error);
            throw error;
        }
    }

    async getToken(environmentModel: EnvironmentModel): Promise<string> {

        const scopes = [`${environmentModel.apiUrl}/user_impersonation`];

        // First check if we have a valid token if an account exists
        const activeAccount = await this.getActiveAccount();
        if (activeAccount) {
            try {
                // Try to silently acquire token
                const silentRequest: SilentFlowRequest = {
                    account: activeAccount,
                    scopes: scopes,
                    authority: this.authority
                };

                const response = await this.pca.acquireTokenSilent(silentRequest);
                console.log('[AUTH-HANDLER: GET-TOKEN] Acquired token silently:', response.accessToken);
                return response.accessToken;
            } catch (error) {
                // Continue with interactive authentication flow below
            }
        }

        // If we reach here, we need to do an interactive login
        try {
            const result = await this.login(environmentModel);

            // Store the account immediately after successful login
            console.log('[AUTH-HANDLER] Setting active account after login:', result.account);
            this.setActiveAccount(result.account);
            
            this.updateStoredEnvironments(environmentModel);

            return result.accessToken;
        } catch (error) {
            throw error;
        }
    }

    async logout(): Promise<void> {
        const activeAccount = await this.getActiveAccount();
        if (activeAccount) {
            try {
                await this.pca.getTokenCache().removeAccount(activeAccount);
                this.removeActiveAccount();
                this.removeActiveEnvironment();
            } catch (error) {
                throw error;
            }
        }
    }

    // Environment model methods
    updateStoredEnvironments(environmentModel: EnvironmentModel): void {
        if (!environmentModel || !environmentModel.url) return;

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
        } catch (error) {
            console.error('[AUTH-HANDLER] Error saving environment model:', error);
        }
    }

    getEnvironmentModels(): EnvironmentModel[] {
        try {
            return this.store.get('environmentModels', []) as EnvironmentModel[];
        } catch (error) {
            console.error('[AUTH-HANDLER] Error getting environment models:', error);
            return [];
        }
    }

    deleteEnvironmentModel(environmentModel: EnvironmentModel): void {
        if (!environmentModel) return;

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
        } catch (error) {
            console.error('[AUTH-HANDLER] Error deleting environment model:', error);
        }
    }

    async getActiveAccount(): Promise<AccountInfo | null> {
        try {
            // First try to get the active account ID from store
            const activeAccountId = this.store.get('activeAccountId', null) as string;
            
            console.log('[AUTH-HANDLER: GET-ACTIVE-ACCOUNT] Active account ID:', activeAccountId);
            if (!activeAccountId || !this.pca) {
                return null;
            }
            
            // Use the MSAL token cache to get all accounts
            const accounts = await this.pca.getTokenCache().getAllAccounts();
            
            // Find the account that matches the stored ID
            const activeAccount = accounts.find(account => account.homeAccountId === activeAccountId) || null;
            console.log('[AUTH-HANDLER: GET-ACTIVE-ACCOUNT] Active account:', activeAccount);
            return activeAccount;
        } catch (error) {
            console.error('[AUTH-HANDLER] Error getting active account from cache:', error);
            return null;
        }
    }

    setActiveAccount(account: AccountInfo): void {
        try {
            // Store just the account ID instead of the full object
            console.log('[AUTH-HANDLER: SET-ACTIVE-ACCOUNT] Storing account ID:', account.homeAccountId);
            this.store.set('activeAccountId', account.homeAccountId);
            
            // Force immediate save to disk
            if (typeof this.store.store === 'function') {
                console.log('[AUTH-HANDLER: SET-ACTIVE-ACCOUNT] Flushing store to disk');
                this.store.store();
            }
            
            // Emit account changed event to renderer process
            this.mainWindow.webContents.send('account-changed', account);
        } catch (error) {
            console.error('[AUTH-HANDLER] Error setting active account:', error);
        }
    }

    removeActiveAccount(): void {
        try {
            this.store.delete('activeAccountId');
            // Emit account changed event with null to renderer process
            this.mainWindow.webContents.send('account-changed', null);
        } catch (error) {
            console.error('[AUTH-HANDLER] Error removing active account:', error);
        }
    }

    setActiveEnvironment(environmentModel: EnvironmentModel): void {
        if (!environmentModel) return;

        try {
            // Save active environment
            this.store.set('activeEnvironment', environmentModel);
            // Emit environment changed event to renderer process
            this.mainWindow.webContents.send('environment-changed', environmentModel);
        } catch (error) {
            console.error('[AUTH-HANDLER] Error setting active environment:', error);
        }
    }

    removeActiveEnvironment(): void {
        try {
            this.store.delete('activeEnvironment');
            // Emit environment changed event with null to renderer process
            this.mainWindow.webContents.send('environment-changed', null);
        } catch (error) {
            console.error('[AUTH-HANDLER] Error removing active environment:', error);
        }
    }

    getActiveEnvironment(): EnvironmentModel | null {
        try {
            return this.store.get('activeEnvironment', null) as EnvironmentModel;
        } catch (error) {
            return null;
        }
    }

    async checkTokenValidity(): Promise<boolean> {
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
        } catch (error) {
            console.log('[AUTH-HANDLER: CHECK-TOKEN-VALIDITY] Token is invalid');
            return false;
        }
    }
}

export default AuthHandler; 