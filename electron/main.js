const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const AuthHandler = require('./auth-handler');

let mainWindow;
let authHandler;

// Check if the build file exists
function getBuildPath() {
  // Try multiple possible build paths with the correct one first
  const possiblePaths = [
    path.join(__dirname, '../dist/power-suite-app/index.html'),  // This should be the correct path
    path.join(__dirname, '../dist/PowerExplorer/index.html'),
    path.join(__dirname, '../dist/power-explorer/index.html'),
    path.join(__dirname, '../dist/browser/index.html'),
    path.join(__dirname, '../dist/index.html')
  ];

  for (const filePath of possiblePaths) {
    console.log('[MAIN] Checking build path:', filePath);
    if (fs.existsSync(filePath)) {
      console.log('[MAIN] Found build at:', filePath);
      return filePath;
    }
  }

  // If no build file found, check for folders
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    console.log('[MAIN] dist folder exists, contents:');
    try {
      const files = fs.readdirSync(distPath);
      console.log('[MAIN] Dist folder contents:');
      files.forEach(file => {
        const filePath = path.join(distPath, file);
        const stats = fs.statSync(filePath);
        console.log(`[MAIN] - ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
        
        // If it's a directory, list its contents too
        if (stats.isDirectory()) {
          try {
            const subFiles = fs.readdirSync(filePath);
            subFiles.forEach(subFile => {
              console.log(`[MAIN]   - ${file}/${subFile}`);
            });
          } catch (err) {
            console.error(`[MAIN] Error reading ${file} subfolder:`, err);
          }
        }
      });
    } catch (err) {
      console.error('[MAIN] Error reading dist folder:', err);
    }
  } else {
    console.error('[MAIN] dist folder not found');
  }

  return null;
}

function createWindow() {
  console.log('[MAIN] Creating main window');
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Get the path to the Angular build
  const indexPath = getBuildPath();
  
  if (!indexPath) {
    console.error('[MAIN] Angular build not found. Make sure to run "npm run build" first.');
    dialog.showErrorBox(
      'Build Not Found', 
      'The Angular app build was not found. Please run "npm run build" and try again.'
    );
    app.quit();
    return;
  }
  
  console.log('[MAIN] Loading Angular app from path:', indexPath);
  
  const appUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: indexPath,
    protocol: 'file:',
    slashes: true
  });
  
  console.log('[MAIN] Loading URL:', appUrl);
  
  mainWindow.loadURL(appUrl).catch(err => {
    console.error('[MAIN] Error loading URL:', err);
    dialog.showErrorBox(
      'Error Loading App', 
      `Failed to load the application: ${err.message}`
    );
  });

  // Open DevTools in development
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  } else {
    // Always open DevTools for debugging
    mainWindow.webContents.openDevTools();
  }

  // Initialize authentication handler
  console.log('[MAIN] Initializing authentication handler');
  authHandler = new AuthHandler(mainWindow);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Check if all required IPC handlers are registered
function verifyIpcHandlers() {
  console.log('[MAIN] Verifying IPC handlers are properly registered');
  
  // List expected handlers for auth
  const expectedHandlers = ['login', 'getToken', 'logout', 'setEnvironmentUrl'];
  
  // Check if handlers exist in Electron
  const registeredHandlers = ipcMain.eventNames();
  
  console.log('[MAIN] Registered IPC handlers:', registeredHandlers);
  
  // Log missing handlers
  const missingHandlers = expectedHandlers.filter(
    handler => !registeredHandlers.includes(handler)
  );
  
  if (missingHandlers.length > 0) {
    console.error('[MAIN] Missing IPC handlers:', missingHandlers);
  } else {
    console.log('[MAIN] All expected IPC handlers are registered');
  }
}

// Add this after auth handler initialization
app.on('ready', () => {
  createWindow();
  
  // Verify handlers after a slight delay to ensure they're registered
  setTimeout(verifyIpcHandlers, 1000);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle IPC messages from renderer process
ipcMain.on('app-ready', (event) => {
  console.log('[MAIN] App is ready in renderer process');
}); 