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
const electron_updater_1 = require("electron-updater");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const auth_handler_1 = __importDefault(require("./auth-handler"));
// Get application info from package.json
const APP_NAME = "Power Explorer";
const APP_PROTOCOL = 'powerexplorer';
// Disable Electron security warnings (doesn't affect security, just the console warnings)
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
electron_updater_1.autoUpdater.autoDownload = true;
// Set application name
electron_1.app.name = APP_NAME;
let mainWindow = null;
let authHandler = null;
// Request single instance lock for Windows/Linux
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    // If we couldn't get the lock, quit the app (prevents multiple instances)
    electron_1.app.quit();
}
else {
    // This event will be emitted when a second instance is launched with arguments
    electron_1.app.on('second-instance', (event, commandLine, workingDirectory) => {
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
    function createWindow() {
        // Get full path to preload script
        const preloadPath = path.join(__dirname, 'preload.js');
        // Create the browser window
        mainWindow = new electron_1.BrowserWindow({
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
        }
        else {
            // Get the absolute path to the Angular app build folder
            // Make sure we're using a normalized absolute path
            const distPath = path.join(appPath, 'dist', 'power-explorer');
            // Check if the directory exists
            if (!fs.existsSync(distPath)) {
                console.error(`[MAIN] Build folder not found at: ${distPath}`);
                // In packaged app, try to find the resources directory inside asar
                const asarDistPath = path.join(appPath, 'dist');
                if (fs.existsSync(asarDistPath)) {
                    console.log(`[MAIN] Found alternative build folder at: ${asarDistPath}`);
                    indexPath = path.join(asarDistPath, 'index.html');
                }
                else {
                    electron_1.dialog.showErrorBox('Build Folder Not Found', `Could not find the Angular build. Please ensure the application is properly built.`);
                    electron_1.app.quit();
                    return;
                }
            }
            else {
                // List files in the directory to verify
                try {
                    const files = fs.readdirSync(distPath);
                    console.log('[MAIN] Files in dist folder:', files);
                }
                catch (err) {
                    console.error('[MAIN] Error reading dist directory:', err);
                }
                // Construct the absolute path to index.html
                indexPath = path.join(distPath, 'index.html');
            }
            // Check if the index file exists
            if (!indexPath || !fs.existsSync(indexPath)) {
                console.error(`[MAIN] Index file not found at: ${indexPath}`);
                // Try fallback path for packaged app
                const fallbackPath = path.join(appPath, 'index.html');
                if (fs.existsSync(fallbackPath)) {
                    indexPath = fallbackPath;
                    console.log(`[MAIN] Using fallback index file at: ${indexPath}`);
                }
                else {
                    electron_1.dialog.showErrorBox('Index File Not Found', `Could not find index.html. Please ensure the application is properly built.`);
                    electron_1.app.quit();
                    return;
                }
            }
            // Format the file URL correctly
            const fileUrl = 'file:///' + indexPath.replace(/\\/g, '/');
            console.log('[MAIN] Loading application from:', fileUrl);
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
                    }
                    else {
                        // If loading.html doesn't exist, use the readFile approach
                        const htmlContent = fs.readFileSync(indexPath, 'utf-8');
                        // Fix paths in HTML content for packaged app
                        let modifiedHtml = htmlContent;
                        // Fix base href for packaged app
                        if (!modifiedHtml.includes('<base href="app://')) {
                            modifiedHtml = modifiedHtml.replace(/<base href=".*?">/, `<base href="app://./">`);
                        }
                        // Fix absolute paths that might point to D:/ or other locations
                        modifiedHtml = modifiedHtml.replace(/(href|src)="([a-zA-Z]:\/.*?\.(css|js))"/g, (match, attr, filepath, ext) => {
                            // Extract just the filename
                            const filename = filepath.split(/[\/\\]/).pop();
                            return `${attr}="app://${filename}"`;
                        });
                        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(modifiedHtml));
                        // After the page loads, fix any remaining style references
                        mainWindow.webContents.on('did-finish-load', () => {
                            mainWindow.webContents.executeJavaScript(`
                // Fix any CSS links with absolute paths 
                document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                  const href = link.getAttribute('href');
                  if (href && href.match(/^[a-zA-Z]:\//)) {
                    // Extract just the filename
                    const filename = href.split(/[\/\\]/).pop();
                    link.setAttribute('href', 'app://' + filename);
                    console.log('Fixed CSS path:', href, 'to', 'app://' + filename);
                  }
                });
              `).catch(err => console.error('Error fixing CSS paths:', err));
                        });
                    }
                }
                catch (fallbackErr) {
                    console.error('[MAIN] Error loading with fallback method:', fallbackErr);
                    electron_1.dialog.showErrorBox('Error Loading App', `Failed to load the application. Please check the logs for details.`);
                }
            });
        }
        // Open DevTools in development
        if (process.env.ELECTRON_START_URL) {
            mainWindow.webContents.openDevTools();
        }
        else {
            // Always open DevTools for debugging
            mainWindow.webContents.openDevTools();
        }
        // Handle external links - open in default browser
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            // Open URLs in the user's browser
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        });
        // Also handle regular anchor links with target="_blank"
        mainWindow.webContents.on('will-navigate', (event, url) => {
            // Only handle external URLs, not app navigation
            if (!url.startsWith('file:')) {
                event.preventDefault();
                electron_1.shell.openExternal(url);
            }
        });
        // Initialize authentication handler
        authHandler = new auth_handler_1.default(mainWindow);
        mainWindow.on('closed', function () {
            mainWindow = null;
        });
        // Only register protocol in production mode
        if (!process.env.ELECTRON_START_URL) {
            // Get the path to the Angular app build folder
            const distPath = path.join(appPath, 'dist', 'power-explorer');
            // Register protocol handler for serving local files
            const protocolName = 'app';
            electron_1.protocol.registerFileProtocol(protocolName, (request, callback) => {
                const url = request.url.substring(`${protocolName}://`.length);
                try {
                    const appPath = path.resolve(__dirname, '..');
                    const distPath = path.join(appPath, 'dist', 'power-explorer');
                    // First try standard dist path
                    const filePath = path.join(distPath, url);
                    if (fs.existsSync(filePath)) {
                        return callback(filePath);
                    }
                    // If not found, try directly in dist (for packaged apps)
                    const asarPath = path.join(appPath, 'dist', url);
                    if (fs.existsSync(asarPath)) {
                        return callback(asarPath);
                    }
                    // If still not found, try in app root
                    const rootPath = path.join(appPath, url);
                    if (fs.existsSync(rootPath)) {
                        return callback(rootPath);
                    }
                    console.error(`[MAIN] Protocol handler: File not found: ${url}`);
                    console.error(`[MAIN] Tried paths: ${filePath}, ${asarPath}, ${rootPath}`);
                    return callback({ path: '' });
                }
                catch (error) {
                    console.error('[MAIN] Protocol error:', error);
                    return callback({ path: '' });
                }
            });
        }
    }
    // Handle deeplink activation - platform specific
    function handleDeepLink(deepLink) {
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
        }
        catch (error) {
            console.error('[MAIN] Error handling deep link:', error);
        }
    }
    // Set up protocol handler for Windows - for when app is not running
    if (process.defaultApp) {
        // Development mode in Electron - use command line arguments
        if (process.argv.length >= 2) {
            electron_1.app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
        }
    }
    else {
        // Production mode - standard registration
        electron_1.app.setAsDefaultProtocolClient(APP_PROTOCOL);
    }
    // Set the app user model ID to make protocol links work with the right app name
    electron_1.app.setAppUserModelId(APP_NAME);
    // macOS specific - handle 'open-url' event
    electron_1.app.on('open-url', (event, url) => {
        event.preventDefault();
        handleDeepLink(url);
    });
    // Check for deep links at startup - Windows/Linux
    const deepLinkUrl = process.argv.find(arg => arg.startsWith(`${APP_PROTOCOL}://`));
    if (process.platform !== 'darwin' && deepLinkUrl) {
    }
    electron_1.app.on('ready', () => {
        // Remove the application menu
        electron_1.Menu.setApplicationMenu(null);
        // Set up custom protocol before creating window
        if (!process.env.ELECTRON_START_URL) {
            const appPath = path.resolve(__dirname, '..');
            const distPath = path.join(appPath, 'dist', 'power-explorer');
            // Register protocol handler for serving local files - skip as this is now in createWindow
            // Intercept file:// protocol to fix path resolution
            electron_1.protocol.interceptFileProtocol('file', (request, callback) => {
                let url = request.url.substr(8); // Strip 'file:///' prefix
                // Windows path handling
                url = decodeURIComponent(url);
                // Log the requested URL for debugging
                console.log('[MAIN] Intercepted file request:', url);
                // Special debug for CSS files to track all style resources
                if (url.includes('.css') || url.endsWith('styles')) {
                    console.log('[MAIN] Style resource requested:', url);
                    // Try multiple approaches for styles
                    // 1. Direct file access
                    if (fs.existsSync(url)) {
                        console.log('[MAIN] Style found at direct path:', url);
                        callback(url);
                        return;
                    }
                    // 2. Try in app.asar/dist
                    const appPath = path.resolve(__dirname, '..');
                    let styleFilename = url;
                    // Extract filename from path
                    if (url.includes('/')) {
                        styleFilename = url.split('/').pop() || '';
                    }
                    else if (url.includes('\\')) {
                        styleFilename = url.split('\\').pop() || '';
                    }
                    // Search for style in dist directory with glob pattern
                    try {
                        const possibleLocations = [
                            path.join(appPath, 'dist', styleFilename),
                            path.join(appPath, 'dist', 'power-explorer', styleFilename),
                            path.join(appPath, 'dist', '**', styleFilename),
                            // If the file has hash, try with wildcard
                            styleFilename.includes('.')
                                ? path.join(appPath, 'dist', '**', styleFilename.split('.')[0] + '.*.' + styleFilename.split('.').pop())
                                : null
                        ].filter(Boolean);
                        console.log('[MAIN] Searching for style in possible locations:', possibleLocations);
                        // Try each possible location
                        for (const location of possibleLocations) {
                            if (location.includes('*')) {
                                // This is a glob pattern, we need to do more complex search
                                // For simplicity, let's skip this for now
                                continue;
                            }
                            if (fs.existsSync(location)) {
                                console.log('[MAIN] Style found at:', location);
                                callback(location);
                                return;
                            }
                        }
                    }
                    catch (error) {
                        console.error('[MAIN] Error searching for style:', error);
                    }
                }
                // Handle asar paths explicitly - check if this is a request for a file in the asar archive
                if (url.includes('app.asar')) {
                    // For paths within the asar archive
                    try {
                        // No need to extract from the archive - Electron handles this automatically
                        // Just make sure the path is valid
                        if (fs.existsSync(url)) {
                            console.log('[MAIN] Found resource in asar at original path:', url);
                            callback(url);
                            return;
                        }
                        // Special handling for CSS files in ASAR
                        if (url.includes('.css')) {
                            // Extract the CSS filename
                            const cssFilename = url.split('/').pop();
                            // Check if we're dealing with a hashed filename like styles.254467662158fe59.css
                            if (cssFilename && cssFilename.includes('.')) {
                                // Try to find the file by traversing the asar structure
                                const asarRoot = url.substring(0, url.indexOf('app.asar') + 'app.asar'.length);
                                // Common directories to look for styles in Angular app
                                const commonDirs = [
                                    path.join(asarRoot, 'dist'),
                                    path.join(asarRoot, 'dist', 'power-explorer'),
                                    path.join(asarRoot, 'dist', 'assets'),
                                    path.join(asarRoot, 'dist', 'styles')
                                ];
                                // Try to find the file in common directories
                                for (const dir of commonDirs) {
                                    const possiblePath = path.join(dir, cssFilename);
                                    console.log('[MAIN] Checking for CSS in ASAR at:', possiblePath);
                                    if (fs.existsSync(possiblePath)) {
                                        console.log('[MAIN] Found CSS in ASAR at:', possiblePath);
                                        callback(possiblePath);
                                        return;
                                    }
                                    // Also try with the base name (without hash)
                                    const parts = cssFilename.split('.');
                                    if (parts.length > 2) {
                                        // This is likely a hashed filename like styles.254467662158fe59.css
                                        const baseFilename = parts[0] + '.' + parts[parts.length - 1];
                                        const baseFilePath = path.join(dir, baseFilename);
                                        console.log('[MAIN] Checking for base CSS in ASAR at:', baseFilePath);
                                        if (fs.existsSync(baseFilePath)) {
                                            console.log('[MAIN] Found base CSS in ASAR at:', baseFilePath);
                                            callback(baseFilePath);
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                        // If the direct path doesn't exist, try to find it based on path components
                        const components = url.split('/');
                        const distIndex = components.indexOf('dist');
                        if (distIndex >= 0) {
                            // Rebuild the path relative to the app directory
                            const relativePath = components.slice(distIndex).join('/');
                            const appPath = path.resolve(__dirname, '..');
                            const distFilePath = path.join(appPath, relativePath);
                            console.log('[MAIN] Trying alternative path:', distFilePath);
                            if (fs.existsSync(distFilePath)) {
                                callback(distFilePath);
                                return;
                            }
                        }
                    }
                    catch (error) {
                        console.error('[MAIN] Error handling asar path:', error);
                    }
                }
                // Special case for files at D:/ root (common error in Electron file loading)
                if (url.match(/^[A-Za-z]:\/(assets|runtime|polyfills|main|styles)/) ||
                    url.match(/^[A-Za-z]:\/.*\.(js|css|html|png|jpg|jpeg|gif|svg)$/)) {
                    // This is likely a file that should be in our app directory
                    // Extract the filename/path from the root
                    const relativePath = url.split(/^[A-Za-z]:\//).pop() || '';
                    const appPath = path.resolve(__dirname, '..');
                    const distFilePath = path.join(appPath, relativePath);
                    console.log('[MAIN] Trying path for root file:', distFilePath);
                    if (fs.existsSync(distFilePath)) {
                        callback(distFilePath);
                        return;
                    }
                    // Also try with dist/power-explorer prefix
                    const distPowerExplorerPath = path.join(appPath, 'dist', 'power-explorer', relativePath);
                    console.log('[MAIN] Trying dist/power-explorer path:', distPowerExplorerPath);
                    if (fs.existsSync(distPowerExplorerPath)) {
                        callback(distPowerExplorerPath);
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
                    const appPath = path.resolve(__dirname, '..');
                    const distFilePath = path.join(appPath, 'dist', 'power-explorer', relativePath);
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
        electron_updater_1.autoUpdater.checkForUpdates();
        // Setup auto-update event listeners
        electron_updater_1.autoUpdater.on('update-available', (info) => {
            if (mainWindow) {
                mainWindow.webContents.send('update-available', info);
            }
        });
        electron_updater_1.autoUpdater.on('update-not-available', (info) => {
            if (mainWindow) {
                mainWindow.webContents.send('update-not-available', info);
            }
        });
        electron_updater_1.autoUpdater.on('error', (err) => {
            if (mainWindow) {
                mainWindow.webContents.send('update-error', err.message);
            }
        });
        // Since we're using silent updates, we can remove these event listeners if not needed
        // But keeping them in case you want to add progress indicators later
        electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
            if (mainWindow) {
                mainWindow.webContents.send('update-progress', progressObj);
            }
        });
        electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
            if (mainWindow) {
                mainWindow.webContents.send('update-downloaded', info);
            }
        });
        // Verify handlers after a slight delay to ensure they're registered
        setTimeout(verifyIpcHandlers, 1000);
    });
    // Check if all required IPC handlers are registered
    function verifyIpcHandlers() {
        // List expected handlers for auth
        const expectedHandlers = ['login', 'getToken', 'logout', 'getActiveAccount'];
        // Check if handlers exist in Electron
        const registeredHandlers = electron_1.ipcMain.eventNames();
        // Log missing handlers
        const missingHandlers = expectedHandlers.filter(handler => !registeredHandlers.includes(handler));
        if (missingHandlers.length > 0) {
            console.error('[MAIN] Missing IPC handlers:', missingHandlers);
        }
        else {
        }
    }
    electron_1.app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
    electron_1.app.on('activate', function () {
        if (mainWindow === null) {
            createWindow();
        }
    });
    // Handle IPC messages from renderer process
    electron_1.ipcMain.on('app-ready', (event) => {
    });
    // Add IPC handler for opening external links
    electron_1.ipcMain.handle('open-external', async (_, url) => {
        if (url) {
            return electron_1.shell.openExternal(url);
        }
        return false;
    });
    // Prevent default browser behavior
    electron_1.app.on('web-contents-created', (event, contents) => {
        contents.on('will-navigate', (event, navigationUrl) => {
            // Prevent navigation from within the app to external sites
            const parsedUrl = new URL(navigationUrl);
            if (!parsedUrl.protocol.includes('file:')) {
                event.preventDefault();
                electron_1.shell.openExternal(navigationUrl);
            }
        });
    });
    // Add IPC handlers for autoupdater
    electron_1.ipcMain.handle('check-for-updates', async () => {
        try {
            return await electron_updater_1.autoUpdater.checkForUpdates();
        }
        catch (error) {
            console.error('Error checking for updates:', error);
            return { error: error.message };
        }
    });
    electron_1.ipcMain.handle('download-update', async () => {
        try {
            return await electron_updater_1.autoUpdater.downloadUpdate();
        }
        catch (error) {
            console.error('Error downloading update:', error);
            return { error: error.message };
        }
    });
    electron_1.ipcMain.handle('quit-and-install', () => {
        electron_updater_1.autoUpdater.quitAndInstall(true, true);
    });
    // Setup periodic update checks (every 6 hours)
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setInterval(() => {
        electron_updater_1.autoUpdater.checkForUpdates().catch(err => {
            console.error('Error during scheduled update check:', err);
        });
    }, SIX_HOURS);
}
//# sourceMappingURL=main.js.map