import { app } from 'electron';
import { PublicClientApplication, LogLevel, AccountInfo, AuthenticationResult, CryptoProvider } from '@azure/msal-node';
import * as http from 'http';
import * as url from 'url';

export class AuthService {
  private clientId = '51f81489-12ee-4a9e-aaae-a2591f45987d';
  private redirectUri = 'http://localhost:3000';
  private authCodeUrlParameters: any;
  private pca: PublicClientApplication;
  private account: AccountInfo | null = null;
  private server: http.Server | null = null;

  constructor() {
    // Initialize MSAL application
    this.pca = new PublicClientApplication({
      auth: {
        clientId: this.clientId,
        authority: 'https://login.microsoftonline.com/common',
      },
      system: {
        loggerOptions: {
          loggerCallback(loglevel, message) {
            console.log(message);
          },
          piiLoggingEnabled: false,
          logLevel: LogLevel.Verbose,
        },
      },
    });

    this.authCodeUrlParameters = {
      scopes: ['User.Read'],
      redirectUri: this.redirectUri,
    };
  }

  async login(): Promise<AuthenticationResult | null> {
    return new Promise((resolve, reject) => {
      // Generate PKCE codes
      const cryptoProvider = new CryptoProvider();
      let pkceCodes: any = {};

      cryptoProvider.generatePkceCodes().then(codes => {
        pkceCodes = codes;

        // Add PKCE code to authorization request
        const authCodeUrlParameters = {
          ...this.authCodeUrlParameters,
          scopes: ['User.Read'],
          codeChallenge: pkceCodes.challenge,
          codeChallengeMethod: 'S256',
        };

        // Start HTTP server to handle redirect
        this.server = http.createServer(async (req, res) => {
          const parsedUrl = url.parse(req.url || '', true);
          const code = parsedUrl.query.code as string;

          if (code) {
            // Close response so browser doesn't hang
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('Authentication complete. You can close this window now.');

            // Close server
            this.server?.close();
            this.server = null;

            try {
              // Exchange code for token
              const tokenResponse = await this.pca.acquireTokenByCode({
                code,
                scopes: ['User.Read'],
                redirectUri: this.redirectUri,
                codeVerifier: pkceCodes.verifier,
              });

              if (tokenResponse) {
                this.account = tokenResponse.account;
                resolve(tokenResponse);
              } else {
                reject(new Error('No token response'));
              }
            } catch (error) {
              reject(error);
            }
          }
        });

        // Start server on port 3000
        this.server.listen(3000, () => {
          console.log('HTTP server listening on port 3000');
        });

        // Get auth code URL
        this.pca.getAuthCodeUrl(authCodeUrlParameters)
          .then((authCodeUrl) => {
            // Open auth URL in default browser
            const { shell } = require('electron');
            shell.openExternal(authCodeUrl);
          })
          .catch((error) => {
            this.server?.close();
            this.server = null;
            reject(error);
          });
      });
    });
  }

  async getToken(scopes: string[] = ['User.Read']): Promise<string | null> {
    if (!this.account) {
      const authResult = await this.login();
      if (!authResult) return null;
      return authResult.accessToken;
    }

    try {
      const silentRequest = {
        account: this.account,
        scopes,
      };
      const response = await this.pca.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      console.log('Silent token acquisition failed, acquiring token using redirect');
      const authResult = await this.login();
      return authResult ? authResult.accessToken : null;
    }
  }

  async logout(): Promise<void> {
    if (this.account) {
      await this.pca.getTokenCache().removeAccount(this.account);
      this.account = null;
    }
  }
} 