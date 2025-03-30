const fs = require('fs');
const path = require('path');

// Get paths
const configJsPath = path.join(__dirname, 'dist/power-explorer/browser/assets/config.js');
const configJsonPath = path.join(__dirname, 'dist/power-explorer/browser/assets/configuration.json');

// Ensure directory exists
const dir = path.dirname(configJsPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Default values
const CLIENT_ID = process.env.CLIENT_ID || '69111799-c2ca-490f-929f-4e5ee63b9792';
const AUTHORITY_URL = process.env.AUTHORITY_URL || 'https://login.microsoftonline.com/common/oauth2/authorize?resource=https://globaldisco.crm.dynamics.com';
const API_SCOPES = process.env.API_SCOPES || 'https://globaldisco.crm.dynamics.com/user_impersonation';
const API_URI = process.env.API_URI || 'https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:4200/';
const POST_LOGOUT_REDIRECT_URI = process.env.POST_LOGOUT_REDIRECT_URI || 'http://localhost:4200/';

// Create config.js content
const configJsContent = `window.config = {
  CLIENT_ID: '${CLIENT_ID}',
  AUTHORITY_URL: '${AUTHORITY_URL}',
  API_SCOPES: '${API_SCOPES}',
  API_URI: '${API_URI}',
  REDIRECT_URI: '${REDIRECT_URI}',
  POST_LOGOUT_REDIRECT_URI: '${POST_LOGOUT_REDIRECT_URI}'
};`;

// Create configuration.json content
const configJsonContent = JSON.stringify({
  msal: {
    auth: {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI,
      navigateToLoginRequestUrl: true
    },
    cache: {
      cacheLocation: "localStorage",
      storeAuthStateInCookie: true
    }
  },
  guard: {
    interactionType: "popup",
    authRequest: {
      scopes: []
    }
  },
  interceptor: {
    interactionType: "popup",
    protectedResourceMap: [
      [API_URI.split('/Instances')[0] + "/", [API_SCOPES]],
      ["https://graph.microsoft.com/v1.0/me", ["https://graph.microsoft.com/User.Read"]]
    ]
  }
}, null, 2);

// Write files
fs.writeFileSync(configJsPath, configJsContent);
console.log(`Environment config.js written to ${configJsPath}`);

fs.writeFileSync(configJsonPath, configJsonContent);
console.log(`Environment configuration.json written to ${configJsonPath}`); 