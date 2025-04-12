const fs = require('fs');
const path = require('path');

// Get paths for production build
const configJsPath = path.join(__dirname, 'dist/power-explorer/assets/config.js');
const configJsonPath = path.join(__dirname, 'dist/power-explorer/assets/configuration.json');
const sourceIdentityDir = path.join(__dirname, 'src', '.well-known');
const targetIdentityDir = path.join(__dirname, 'dist', 'power-explorer', '.well-known');
const identityFileName = 'microsoft-identity-association.json';

// Get paths for development (src folder)
const devConfigJsPath = path.join(__dirname, 'src/assets/config.js');
const devConfigJsonPath = path.join(__dirname, 'src/assets/configuration.json');
const devIdentityDir = path.join(__dirname, 'src', '.well-known');

// Ensure directories exist
const configDir = path.dirname(configJsPath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

if (!fs.existsSync(targetIdentityDir)) {
  fs.mkdirSync(targetIdentityDir, { recursive: true });
}

// Ensure src/assets directory exists for development
const devConfigDir = path.dirname(devConfigJsPath);
if (!fs.existsSync(devConfigDir)) {
  fs.mkdirSync(devConfigDir, { recursive: true });
}

// Default values
const CLIENT_ID = process.env.CLIENT_ID || 'ecf5ee34-a289-457c-908a-079a2a431d86';
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

// Create identity file content
const identityContent = JSON.stringify({
  "associatedApplications": [
    {
      "applicationId": CLIENT_ID
    }
  ]
}, null, 2);

// Write config files for production
try {
  // Write production config files
  fs.writeFileSync(configJsPath, configJsContent);
  console.log(`Environment config.js written to ${configJsPath}`);

  fs.writeFileSync(configJsonPath, configJsonContent);
  console.log(`Environment configuration.json written to ${configJsonPath}`);

  // Copy the Microsoft identity association file for production
  try {
    if (fs.existsSync(path.join(sourceIdentityDir, identityFileName))) {
      fs.copyFileSync(
        path.join(sourceIdentityDir, identityFileName),
        path.join(targetIdentityDir, identityFileName)
      );
      console.log(`Identity file copied to ${path.join(targetIdentityDir, identityFileName)}`);
    } else {
      fs.writeFileSync(path.join(targetIdentityDir, identityFileName), identityContent);
      console.log(`Default identity file created at ${path.join(targetIdentityDir, identityFileName)}`);
    }
  } catch (error) {
    console.error(`Error handling identity file for production: ${error.message}`);
  }
} catch (error) {
  console.error(`Error writing production config files: ${error.message}`);
}

// Write config files for development
try {
  // Write development config files
  fs.writeFileSync(devConfigJsPath, configJsContent);
  console.log(`Development config.js written to ${devConfigJsPath}`);

  fs.writeFileSync(devConfigJsonPath, configJsonContent);
  console.log(`Development configuration.json written to ${devConfigJsonPath}`);

  // Create identity file for development
  if (!fs.existsSync(devIdentityDir)) {
    fs.mkdirSync(devIdentityDir, { recursive: true });
  }
  
  // Create or update identity file in src folder
  fs.writeFileSync(path.join(devIdentityDir, identityFileName), identityContent);
  console.log(`Development identity file created at ${path.join(devIdentityDir, identityFileName)}`);
} catch (error) {
  console.error(`Error writing development config files: ${error.message}`);
} 