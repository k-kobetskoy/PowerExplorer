const { BrowserWindow, ipcMain, shell } = require('electron');
const http = require('http');
const url = require('url');
const { PublicClientApplication, LogLevel, CryptoProvider } = require('@azure/msal-node');
const path = require('path');
const fs = require('fs');

// This module handles Microsoft authentication in Electron
class AuthHandler {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.authWindow = null;
    this.server = null;
    this.pca = null;
    this.account = null;
    this.availablePorts = [8080, 8081, 8082, 8083, 8090, 8091, 5000, 5001, 4000, 4001, 3001, 3002, 3000]; // List of ports to try
    this.redirectUri = null;
    this.defaultScopes = ['User.Read']; // Default scopes if none provided
    this.environmentUrl = null; // Current environment URL
    
    console.log('[AUTH-HANDLER] Initializing AuthHandler');
    
    // Initialize MSAL
    this.initializeMsal();
    
    // Register IPC handlers
    this.registerIpcHandlers();
  }
  
  initializeMsal(userConfig = null) {
    console.log('[AUTH-HANDLER] Initializing MSAL');
    try {
      // Use user-provided config if available, otherwise use default config
      const config = userConfig || {};
      
      // Basic default configuration with hardcoded app ID
      const msalConfig = {
        auth: {
          // Hardcode the app ID as requested
          clientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
          // Use provided authority or default
          authority: config.authority || 'https://login.microsoftonline.com/common',
          // Set redirect URI to null to force MSAL to use the redirectUri provided in the request
          redirectUri: null
        },
        system: {
          loggerOptions: {
            loggerCallback(loglevel, message) {
              console.log(`[MSAL-${loglevel}] ${message}`);
            },
            piiLoggingEnabled: false,
            logLevel: LogLevel.Verbose,
          },
        },
      };
      
      console.log('[AUTH-HANDLER] Creating MSAL instance with config:', {
        clientId: msalConfig.auth.clientId,
        authority: msalConfig.auth.authority,
        redirectUri: msalConfig.auth.redirectUri
      });
      
      this.pca = new PublicClientApplication(msalConfig);
    } catch (error) {
      console.error('[AUTH-HANDLER] Error initializing MSAL:', error);
    }
  }
  
  registerIpcHandlers() {
    console.log('[AUTH-HANDLER] Registering IPC handlers');
    
    // Handle authentication requests from the renderer process
    ipcMain.handle('login', async (event, environmentUrl, userConfig) => {
      console.log('[AUTH-HANDLER] Login requested for environment:', environmentUrl);
      try {
        // Store the environment URL for future application use
        if (environmentUrl) {
          console.log('[AUTH-HANDLER] Storing environment URL for later use:', environmentUrl);
          this.environmentUrl = environmentUrl;
          this._targetEnvironmentUrl = environmentUrl;
        }
        
        // Process user configuration if provided
        if (userConfig) {
          console.log('[AUTH-HANDLER] Using user provided configuration for login');
        }
        
        const result = await this.login(userConfig);
        console.log('[AUTH-HANDLER] Login successful');
        return { success: true, account: result.account, accessToken: result.accessToken };
      } catch (error) {
        console.error('[AUTH-HANDLER] Login error:', error);
        // Always return a response, even on error
        return { success: false, error: error.message || 'Unknown error during login' };
      }
    });
    
    // Handle token acquisition
    ipcMain.handle('getToken', async (event, scopes, environmentUrl, userConfig) => {
      console.log('[AUTH-HANDLER] Token requested for scopes:', scopes, 'environment:', environmentUrl);
      try {
        // Update environment URL if provided
        if (environmentUrl) {
          this.environmentUrl = environmentUrl;
        }
        
        // Use dynamic user configuration if provided
        if (userConfig) {
          console.log('[AUTH-HANDLER] Using provided user configuration:', userConfig);
        }
        
        // Pass along all parameters to getToken
        const token = await this.getToken(scopes, environmentUrl, userConfig);
        console.log('[AUTH-HANDLER] Token acquired successfully');
        return { success: true, accessToken: token };
      } catch (error) {
        console.error('[AUTH-HANDLER] Get token error:', error);
        return { success: false, error: error.message || 'Unknown error getting token' };
      }
    });
    
    // Handle log out requests
    ipcMain.handle('logout', async () => {
      console.log('[AUTH-HANDLER] Logout requested');
      try {
        await this.logout();
        console.log('[AUTH-HANDLER] Logout successful');
        return { success: true };
      } catch (error) {
        console.error('[AUTH-HANDLER] Logout error:', error);
        return { success: false, error: error.message || 'Unknown error during logout' };
      }
    });
    
    // Handle environment URL update
    ipcMain.handle('setEnvironmentUrl', async (event, environmentUrl) => {
      console.log('[AUTH-HANDLER] Setting environment URL:', environmentUrl);
      try {
        if (!environmentUrl) {
          console.error('[AUTH-HANDLER] No environment URL provided');
          return { success: false, error: 'No environment URL provided' };
        }
        
        this.environmentUrl = environmentUrl;
        // Store for future use
        this._targetEnvironmentUrl = environmentUrl;
        
        console.log('[AUTH-HANDLER] Environment URL set successfully to:', environmentUrl);
        return { success: true };
      } catch (error) {
        console.error('[AUTH-HANDLER] Error setting environment URL:', error);
        return { success: false, error: error.message || 'Unknown error setting environment URL' };
      }
    });
  }
  
  // Get appropriate scopes based on the environment and user configuration
  getDataverseScopes() {
    if (!this.environmentUrl) {
      console.log('[AUTH-HANDLER] No environment URL set, using default empty scopes');
      return []; // Return empty array instead of hardcoded Graph API scope
    }
    
    try {
      // Create a scope based on the environment URL
      const apiUrl = this.environmentUrl.endsWith('/') 
        ? this.environmentUrl.slice(0, -1) 
        : this.environmentUrl;
      
      console.log('[AUTH-HANDLER] Creating environment-specific scope for:', apiUrl);
      return [`${apiUrl}/user_impersonation`];
    } catch (error) {
      console.error('[AUTH-HANDLER] Error creating scopes:', error);
      return []; // Return empty array instead of hardcoded scope
    }
  }
  
  cleanupServer() {
    if (this.server) {
      try {
        this.server.close();
      } catch (err) {
        console.error('[AUTH-HANDLER] Error closing server:', err);
      }
      this.server = null;
    }
  }
  
  async login(userConfig = null) {
    console.log('[AUTH-HANDLER] Starting login process', userConfig ? 'with custom config' : 'with default config');
    return new Promise((resolve, reject) => {
      // Set timeout to ensure promise resolves/rejects
      const timeoutId = setTimeout(() => {
        console.error('[AUTH-HANDLER] Login timeout after 60 seconds');
        this.cleanupServer();
        reject(new Error('Login timeout after 60 seconds'));
      }, 60000);

      // Generate PKCE codes
      const cryptoProvider = new CryptoProvider();
      let pkceCodes = {};

      cryptoProvider.generatePkceCodes().then(async (codes) => {
        try {
          console.log('[AUTH-HANDLER] PKCE codes generated');
          pkceCodes = codes;
          
          // Create request handler
          const requestHandler = async (req, res) => {
            try {
              console.log('[AUTH-HANDLER] Received request to redirect server:', req.url);
              const parsedUrl = url.parse(req.url || '', true);
              const code = parsedUrl.query.code;
              const error = parsedUrl.query.error;

              if (error) {
                console.error('[AUTH-HANDLER] Error in auth redirect:', error, parsedUrl.query.error_description);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('Authentication failed. You can close this window.');
                
                this.cleanupServer();
                clearTimeout(timeoutId);
                reject(new Error(`Authentication failed: ${parsedUrl.query.error_description || error}`));
                return;
              }

              if (code) {
                console.log('[AUTH-HANDLER] Auth code received');
                // Close response so browser doesn't hang
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('Authentication complete. You can close this window now.');

                // Close server
                console.log('[AUTH-HANDLER] Closing redirect server');
                this.cleanupServer();

                try {
                  // Determine which scopes to use - start with empty array
                  let scopes = [];
                  
                  console.log('[AUTH-HANDLER] DEBUG: Starting token exchange, userConfig:', userConfig);
                  
                  if (userConfig && userConfig.scopes && userConfig.scopes.length > 0) {
                    // Use custom scopes from config if provided
                    scopes = userConfig.scopes;
                    console.log('[AUTH-HANDLER] DEBUG: Using custom scopes from user config:', scopes);
                  } else if (userConfig && userConfig.clientId && 
                             userConfig.clientId !== '51f81489-12ee-4a9e-aaae-a2591f45987d') {
                    // For custom app IDs, we can try to use environment-specific scope
                    if (this.environmentUrl) {
                      const apiUrl = this.environmentUrl.endsWith('/') 
                        ? this.environmentUrl.slice(0, -1) 
                        : this.environmentUrl;
                      scopes = [`${apiUrl}/user_impersonation`];
                      console.log('[AUTH-HANDLER] DEBUG: Using custom app ID with environment scope:', scopes);
                    }
                  } else {
                    // For public app ID, use environment-specific scopes from getDataverseScopes
                    scopes = this.getDataverseScopes();
                    console.log('[AUTH-HANDLER] DEBUG: Using environment-specific scopes:', scopes);
                  }
                  
                  // Configure token request
                  const tokenRequest = {
                    code,
                    scopes: scopes,
                    redirectUri: this.redirectUri,
                    codeVerifier: pkceCodes.verifier
                  };
                  
                  // Exchange code for token
                  console.log('[AUTH-HANDLER] DEBUG: Final token exchange request:', JSON.stringify(tokenRequest, null, 2));
                  const tokenResponse = await this.pca.acquireTokenByCode(tokenRequest);

                  if (tokenResponse) {
                    console.log('[AUTH-HANDLER] Token response received');
                    this.account = tokenResponse.account;
                    clearTimeout(timeoutId);
                    resolve(tokenResponse);
                  } else {
                    console.error('[AUTH-HANDLER] No token response received');
                    clearTimeout(timeoutId);
                    reject(new Error('No token response'));
                  }
                } catch (error) {
                  console.error('[AUTH-HANDLER] Error acquiring token by code:', error);
                  clearTimeout(timeoutId);
                  reject(error);
                }
              }
            } catch (error) {
              console.error('[AUTH-HANDLER] Error in request handler:', error);
              clearTimeout(timeoutId);
              reject(error);
            }
          };

          // Try each port until we find one that works
          let serverCreated = false;
          for (const port of this.availablePorts) {
            if (serverCreated) break;
            
            try {
              console.log(`[AUTH-HANDLER] Attempting to create server on port ${port}`);
              // Create server with synchronous error handling
              this.server = http.createServer(requestHandler);
              
              // Add one-time error handler for just the listen call
              const onError = (err) => {
                if (err.code === 'EADDRINUSE') {
                  console.log(`[AUTH-HANDLER] Port ${port} is in use, trying next port`);
                  this.server.removeListener('error', onError);
                  this.server.close();
                  this.server = null;
                } else {
                  console.error(`[AUTH-HANDLER] Server error on port ${port}:`, err);
                  clearTimeout(timeoutId);
                  reject(err);
                }
              };
              
              this.server.once('error', onError);
              
              // Use events for async listening but with synchronous flow
              this.server.listen(port, () => {
                console.log(`[AUTH-HANDLER] HTTP server listening on port ${port}`);
                // Use a local loopback redirect URI, not an application-specific one
                this.redirectUri = `http://localhost:${port}`;
                console.log(`[AUTH-HANDLER] Set redirect URI to: ${this.redirectUri}`);
                serverCreated = true;
                this.server.removeListener('error', onError);
                
                // Now proceed with OAuth flow
                this.proceedWithOAuthFlow(pkceCodes, resolve, reject, timeoutId, userConfig);
              });
              
              // Wait a bit before trying next port
              await new Promise(r => setTimeout(r, 100));
            } catch (err) {
              console.error(`[AUTH-HANDLER] Error with port ${port}:`, err);
            }
          }
          
          if (!serverCreated) {
            clearTimeout(timeoutId);
            reject(new Error('Could not find an available port for the auth server'));
          }
        } catch (error) {
          console.error('[AUTH-HANDLER] Error during login process:', error);
          this.cleanupServer();
          clearTimeout(timeoutId);
          reject(error);
        }
      }).catch(error => {
        console.error('[AUTH-HANDLER] Error generating PKCE codes:', error);
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  async proceedWithOAuthFlow(pkceCodes, resolve, reject, timeoutId, userConfig = null) {
    try {
      // Determine which scopes to use
      let scopes = [];
      
      console.log('[AUTH-HANDLER] DEBUG: Starting proceedWithOAuthFlow, userConfig:', userConfig);
      
      // If user provided configuration with scopes, use those
      if (userConfig && userConfig.scopes && userConfig.scopes.length > 0) {
        scopes = userConfig.scopes;
        console.log('[AUTH-HANDLER] DEBUG: Using scopes from user config:', scopes);
      } 
      // Otherwise, generate environment-specific scopes if possible
      else if (this.environmentUrl) {
        scopes = this.getDataverseScopes();
        console.log('[AUTH-HANDLER] DEBUG: Got scopes from getDataverseScopes():', scopes);
      }
      
      // If still no scopes, try to get default scopes from MSAL config
      if (scopes.length === 0 && this.pca && this.pca.config && this.pca.config.auth && this.pca.config.auth.defaultScopes) {
        scopes = this.pca.config.auth.defaultScopes;
        console.log('[AUTH-HANDLER] DEBUG: Using default scopes from MSAL config:', scopes);
      }
      
      // Ensure redirectUri is set and valid
      if (!this.redirectUri) {
        console.error('[AUTH-HANDLER] ERROR: redirectUri is not set!');
        reject(new Error('redirectUri is not set'));
        return;
      }
      
      console.log('[AUTH-HANDLER] DEBUG: Using redirectUri:', this.redirectUri);
      
      // Add PKCE code to authorization request
      const authCodeUrlParameters = {
        scopes: scopes,
        redirectUri: this.redirectUri,  // This should be the local server URL
        codeChallenge: pkceCodes.challenge,
        codeChallengeMethod: 'S256',
      };
      
      // If user provided custom authority, use it
      if (userConfig && userConfig.authority) {
        authCodeUrlParameters.authority = userConfig.authority;
      }
      
      console.log('[AUTH-HANDLER] DEBUG: Final auth parameters:', JSON.stringify(authCodeUrlParameters, null, 2));
      
      // Get auth code URL
      console.log('[AUTH-HANDLER] Getting auth code URL');
      const authCodeUrl = await this.pca.getAuthCodeUrl(authCodeUrlParameters);
      
      // Log the URL to see what's being used - this shows what scopes are actually requested
      console.log('[AUTH-HANDLER] DEBUG: Full auth URL:', authCodeUrl);
      
      // Open auth URL in default browser
      console.log('[AUTH-HANDLER] Opening auth URL in browser');
      shell.openExternal(authCodeUrl);
    } catch (error) {
      console.error('[AUTH-HANDLER] Error during OAuth flow:', error);
      this.cleanupServer();
      clearTimeout(timeoutId);
      reject(error);
    }
  }

  async getToken(scopes = null, environmentUrl = null, userConfig = null) {
    console.log('[AUTH-HANDLER] Getting token with:', { 
      scopes, 
      environmentUrl: environmentUrl || this.environmentUrl,
      userConfig 
    });
    
    // Use environment URL if provided
    if (environmentUrl) {
      this.environmentUrl = environmentUrl;
      this._targetEnvironmentUrl = environmentUrl;
    }
    
    // Handle dynamic user configuration
    let effectiveScopes = scopes || []; // Default to provided scopes or empty array
    let authority = null;
    // Hardcode the client ID as requested
    let clientId = '51f81489-12ee-4a9e-aaae-a2591f45987d'; 
    
    if (userConfig) {
      console.log('[AUTH-HANDLER] Using dynamic user configuration:', userConfig);
      
      // If user provided custom scopes, use them
      if (userConfig.scopes && userConfig.scopes.length > 0) {
        effectiveScopes = userConfig.scopes;
        console.log('[AUTH-HANDLER] Using custom scopes:', effectiveScopes);
      }
      
      // If user provided custom authority
      if (userConfig.authority) {
        authority = userConfig.authority;
        console.log('[AUTH-HANDLER] Using custom authority:', authority);
      }
    } 
    // If no effective scopes yet, try to get environment-specific ones
    if (effectiveScopes.length === 0 && this.environmentUrl) {
      effectiveScopes = this.getDataverseScopes();
      console.log('[AUTH-HANDLER] Using environment-specific scopes:', effectiveScopes);
    }
    
    // If no account exists, we need to login first
    if (!this.account) {
      console.log('[AUTH-HANDLER] No account, initiating login');
      try {
        // Create a custom authority if provided
        if (userConfig && userConfig.authority) {
          const msalConfig = {
            auth: {
              clientId: clientId,
              authority: authority || 'https://login.microsoftonline.com/common'
            }
          };
          console.log('[AUTH-HANDLER] Creating new MSAL instance with config:', msalConfig);
          this.pca = new PublicClientApplication(msalConfig);
        }
        
        const authResult = await this.login(userConfig);
        return authResult.accessToken;
      } catch (error) {
        console.error('[AUTH-HANDLER] Error during login in getToken:', error);
        throw error;
      }
    }

    try {
      console.log('[AUTH-HANDLER] Attempting silent token acquisition with scopes:', effectiveScopes);
      const silentRequest = {
        account: this.account,
        scopes: effectiveScopes,
      };
      
      // If using custom authority, include it
      if (authority) {
        silentRequest.authority = authority;
      }
      
      const response = await this.pca.acquireTokenSilent(silentRequest);
      console.log('[AUTH-HANDLER] Silent token acquisition successful');
      return response.accessToken;
    } catch (error) {
      console.log('[AUTH-HANDLER] Silent token acquisition failed, acquiring token using redirect');
      try {
        // Create a custom authority if provided
        if (userConfig && userConfig.authority) {
          const msalConfig = {
            auth: {
              clientId: clientId,
              authority: authority || 'https://login.microsoftonline.com/common'
            }
          };
          console.log('[AUTH-HANDLER] Creating new MSAL instance with config:', msalConfig);
          this.pca = new PublicClientApplication(msalConfig);
        }
        
        const authResult = await this.login(userConfig);
        return authResult.accessToken;
      } catch (loginError) {
        console.error('[AUTH-HANDLER] Error during login in getToken:', loginError);
        throw loginError;
      }
    }
  }

  async logout() {
    console.log('[AUTH-HANDLER] Logging out');
    if (this.account) {
      try {
        await this.pca.getTokenCache().removeAccount(this.account);
        this.account = null;
        console.log('[AUTH-HANDLER] Account removed from token cache');
      } catch (error) {
        console.error('[AUTH-HANDLER] Error during logout:', error);
        throw error;
      }
    }
  }
}

module.exports = AuthHandler; 