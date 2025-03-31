const fs = require('fs');
const path = require('path');

// Get paths
const configJsPath = path.join(__dirname, 'dist/power-explorer/assets/config.js');
const configJsonPath = path.join(__dirname, 'dist/power-explorer/assets/configuration.json');
const sourceIdentityDir = path.join(__dirname, 'src', '.well-known');
const targetIdentityDir = path.join(__dirname, 'dist', 'power-explorer', '.well-known');
const identityFileName = 'microsoft-identity-association.json';

// Ensure directories exist
const configDir = path.dirname(configJsPath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

if (!fs.existsSync(targetIdentityDir)) {
  fs.mkdirSync(targetIdentityDir, { recursive: true });
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

// Write config files
fs.writeFileSync(configJsPath, configJsContent);
console.log(`Environment config.js written to ${configJsPath}`);

fs.writeFileSync(configJsonPath, configJsonContent);
console.log(`Environment configuration.json written to ${configJsonPath}`);

// Copy the Microsoft identity association file
try {
  fs.copyFileSync(
    path.join(sourceIdentityDir, identityFileName),
    path.join(targetIdentityDir, identityFileName)
  );
  console.log(`Identity file copied successfully to ${path.join(targetIdentityDir, identityFileName)}`);
} catch (error) {
  console.error(`Error copying identity file: ${error.message}`);
  // If the source file doesn't exist, create a default one
  if (error.code === 'ENOENT') {
    console.log('Source identity file not found. Creating a default identity file.');
    const defaultIdentityContent = JSON.stringify({
      "associatedApplications": [
        {
          "applicationId": CLIENT_ID
        }
      ]
    }, null, 2);
    
    fs.writeFileSync(path.join(targetIdentityDir, identityFileName), defaultIdentityContent);
    console.log(`Default identity file created at ${path.join(targetIdentityDir, identityFileName)}`);
  }
} 