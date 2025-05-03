import { app, BrowserWindow, ipcMain, dialog, shell, protocol } from 'electron';
import { autoUpdater, AppUpdater } from 'electron-updater';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import AuthHandler from './auth-handler';


// Get application info from package.json
const APP_NAME = "Power Explorer";
const APP_PROTOCOL = 'powerexplorer';

// Disable Electron security warnings (doesn't affect security, just the console warnings)
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.autoDownload = false;

// Set application name
app.name = APP_NAME;

let mainWindow: BrowserWindow | null = null;
let authHandler: AuthHandler | null = null;

// Request single instance lock for Windows/Linux
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If we couldn't get the lock, quit the app (prevents multiple instances)
  app.quit();
} else {
  // This event will be emitted when a second instance is launched with arguments
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      
      // Check for deep link URLs in command line arguments
      const deepLinkUrl = commandLine.find(arg => arg.startsWith(`${APP_PROTOCOL}://`));
      if (deepLinkUrl && authHandler) {
        handleDeepLink(deepLinkUrl);
      }
    }
  });
  
  function createWindow(): void {
    
    // Get full path to preload script
    const preloadPath = path.join(__dirname, 'preload.js');
    
    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1600,
      height: 1000,
      title: APP_NAME,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        sandbox: false, // Disable sandbox for better compatibility
        webSecurity: false // Disable web security in development for easier API access
      }
    });

    // Get the absolute path to the app directory
    const appPath = path.resolve(__dirname, '..');

    // In development, use the dev server URL
    // In production, use an absolute file:// URL
    let indexPath;
    if (process.env.ELECTRON_START_URL) {
      mainWindow.loadURL(process.env.ELECTRON_START_URL);
    } else {
      // Get the absolute path to the Angular app build folder
      // Make sure we're using a normalized absolute path
      const distPath = path.join(appPath, 'dist', 'power-explorer');
      
      // Check if the directory exists
      if (!fs.existsSync(distPath)) {
        console.error(`[MAIN] Build folder not found at: ${distPath}`);
        dialog.showErrorBox(
          'Build Folder Not Found',
          `Could not find the Angular build at ${distPath}. Please run "npm run build" first.`
        );
        app.quit();
        return;
      }
      
      // List files in the directory to verify
      const files = fs.readdirSync(distPath);

      // Construct the absolute path to index.html
      indexPath = path.join(distPath, 'index.html');
      
      // Check if the file exists
      if (!fs.existsSync(indexPath)) {
        dialog.showErrorBox(
          'Index File Not Found',
          `Could not find index.html at ${indexPath}. Please ensure the Angular build is complete.`
        );
        app.quit();
        return;
      }

      // Format the file URL correctly
      const fileUrl = 'file:///' + indexPath.replace(/\\/g, '/');

      // Load the index.html file directly
      mainWindow.loadURL(fileUrl).catch(err => {
        console.error('[MAIN] Error loading file:', err);
        
        // Try loading with a different approach as fallback
        try {
          // First try loading via our loading.html file
          const loadingPath = path.join(distPath, 'assets', 'loading.html');
          
          if (fs.existsSync(loadingPath)) {
            const loadingUrl = 'file:///' + loadingPath.replace(/\\/g, '/');
            mainWindow.loadURL(loadingUrl);
          } else {
            // If loading.html doesn't exist, use the readFile approach
            const htmlContent = fs.readFileSync(indexPath, 'utf-8');
            mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
          }
        } catch (fallbackErr) {
          console.error('[MAIN] Error loading with fallback method:', fallbackErr);
          dialog.showErrorBox(
            'Error Loading App',
            `Failed to load the application. Please check the logs for details.`
          );
        }
      });
    }

    // Open DevTools in development
    if (process.env.ELECTRON_START_URL) {
      mainWindow.webContents.openDevTools();
    } else {
      // Always open DevTools for debugging
      mainWindow.webContents.openDevTools();
    }

    // Handle external links - open in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Open URLs in the user's browser
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Also handle regular anchor links with target="_blank"
    mainWindow.webContents.on('will-navigate', (event, url) => {
      // Only handle external URLs, not app navigation
      if (!url.startsWith('file:')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // Initialize authentication handler
    authHandler = new AuthHandler(mainWindow);

    mainWindow.on('closed', function () {
      mainWindow = null;
    });

    // Only register protocol in production mode
    if (!process.env.ELECTRON_START_URL) {
      // Get the path to the Angular app build folder
      const distPath = path.join(appPath, 'dist', 'power-explorer');
      
      // Register protocol handler for serving local files
      const protocolName = 'app';
      protocol.registerFileProtocol(protocolName, (request, callback) => {
        const url = request.url.substring(`${protocolName}://`.length);
        try {
          return callback(path.join(distPath, url));
        } catch (error) {
          console.error(error);
          return callback({ path: '' });
        }
      });
    }
  }

  // Handle deeplink activation - platform specific
  function handleDeepLink(deepLink: string) {
    
    if (!deepLink || !deepLink.startsWith(`${APP_PROTOCOL}://`)) {
      return;
    }
    
    try {
      // Parse the deep link URL
      const parsedUrl = new URL(deepLink);
      const origin = parsedUrl.hostname;
      
      if (origin === 'auth') {
        // Forward to auth handler if available
        if (authHandler && mainWindow) {
          // Send the deep link to the auth handler
          authHandler.handleAuthRedirect({});
          
          // Focus the main window
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.focus();
        }
      }
    } catch (error) {
      console.error('[MAIN] Error handling deep link:', error);
    }
  }

  // Set up protocol handler for Windows - for when app is not running
  if (process.defaultApp) {
    // Development mode in Electron - use command line arguments
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    // Production mode - standard registration
    app.setAsDefaultProtocolClient(APP_PROTOCOL);
  }

  // Set the app user model ID to make protocol links work with the right app name
  app.setAppUserModelId(APP_NAME);

  // macOS specific - handle 'open-url' event
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Check for deep links at startup - Windows/Linux
  const deepLinkUrl = process.argv.find(arg => arg.startsWith(`${APP_PROTOCOL}://`));
  if (process.platform !== 'darwin' && deepLinkUrl) {
  }

  app.on('ready', () => {
    // Set up custom protocol before creating window
    if (!process.env.ELECTRON_START_URL) {
      const appPath = path.resolve(__dirname, '..');
      const distPath = path.join(appPath, 'dist', 'power-explorer');
      
      // Register protocol handler for serving local files
      protocol.registerFileProtocol('app', (request, callback) => {
        const url = request.url.substring('app://'.length);
        try {
          return callback(path.join(distPath, url));
        } catch (error) {
          console.error('[MAIN] Protocol error:', error);
          return callback({ path: '' });
        }
      });

      // Intercept file:// protocol to fix path resolution
      protocol.interceptFileProtocol('file', (request, callback) => {
        let url = request.url.substr(8); // Strip 'file:///' prefix
        
        // Windows path handling
        url = decodeURIComponent(url);
        
        // Special case for files at D:/ root (common error in Electron file loading)
        if (url.match(/^[A-Za-z]:\/(assets|runtime|polyfills|main|styles)/) || 
            url.match(/^[A-Za-z]:\/.*\.(js|css|html|png|jpg|jpeg|gif|svg)$/)) {
          // This is likely a file that should be in our app directory
          
          // Extract the filename/path from the root
          const relativePath = url.split(/^[A-Za-z]:\//).pop() || '';
          const distFilePath = path.join(distPath, relativePath);
          
          if (fs.existsSync(distFilePath)) {
            callback(distFilePath);
            return;
          }
        }
        
        // Handle app paths explicitly
        if (url.includes('power-explorer') && !url.includes('node_modules')) {
          
          // If URL ends with a directory, look for index.html
          if (url.endsWith('/') || url.endsWith('\\')) {
            url = path.join(url, 'index.html');
          }
          
          // Try absolute path first
          if (fs.existsSync(url)) {
            callback(url);
            return;
          }
          
          // Try relative to the dist folder
          const relativePath = url.split(/[\\/]power-explorer[\\/]/).pop() || '';
          const distFilePath = path.join(distPath, relativePath);
          
          console.log('[MAIN] Looking for file at:', distFilePath);
          if (fs.existsSync(distFilePath)) {
            callback(distFilePath);
            return;
          }
        }
        
        // Handle CDN URLs that accidentally got file:// protocol
        if (url.includes('cdn.jsdelivr.net') || url.includes('fonts.googleapis.com')) {
          const httpUrl = 'https://' + url;
          
          // For CDN URLs, we can't serve them locally, so we redirect to the real URL
          // This requires opening an HTTP request, which we want to avoid
          // Instead, let's just inform that this URL should be using https://
          callback({ error: -2 }); // Cancel the request
          
          // Try to patch the HTML to fix these URLs
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript(`
              document.querySelectorAll('link[href^="file://cdn"], link[href^="file://fonts"]').forEach(link => {
                const href = link.getAttribute('href');
                if (href) {
                  link.setAttribute('href', 'https://' + href.substring(7));
                  console.log('Fixed CDN URL:', href, 'to', 'https://' + href.substring(7));
                }
              });
            `).catch(err => console.error('Error fixing CDN URLs:', err));
          }
          return;
        }
        
        // Default behavior - use the original path
        callback(url);
      });
    }

    createWindow();
    
    // Check if we launched with a deep link from Windows/Linux
    if (process.platform !== 'darwin') {
      const deepLinkUrl = process.argv.find(arg => arg.startsWith(`${APP_PROTOCOL}://`));
      if (deepLinkUrl) {
        // Delay the deep link handling slightly to ensure window is fully loaded
        setTimeout(() => {
          handleDeepLink(deepLinkUrl);
        }, 1000);
      }
    }
    
    // Check for updates
    autoUpdater.checkForUpdates();

    // Verify handlers after a slight delay to ensure they're registered
    setTimeout(verifyIpcHandlers, 1000);
  });

  // Check if all required IPC handlers are registered
  function verifyIpcHandlers(): void {
    
    // List expected handlers for auth
    const expectedHandlers: string[] = ['login', 'getToken', 'logout', 'getActiveAccount'];
    
    // Check if handlers exist in Electron
    const registeredHandlers = ipcMain.eventNames();
    
    
    // Log missing handlers
    const missingHandlers = expectedHandlers.filter(
      handler => !registeredHandlers.includes(handler)
    );
    
    if (missingHandlers.length > 0) {
      console.error('[MAIN] Missing IPC handlers:', missingHandlers);
    } else {
    }
  }

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
  });

  // Add IPC handler for opening external links
  ipcMain.handle('open-external', async (_, url: string) => {
    if (url) {
      return shell.openExternal(url);
    }
    return false;
  });

  // Prevent default browser behavior
  app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      // Prevent navigation from within the app to external sites
      const parsedUrl = new URL(navigationUrl);
      if (!parsedUrl.protocol.includes('file:')) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    });
  });
} 