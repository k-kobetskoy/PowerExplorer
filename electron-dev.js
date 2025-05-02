/**
 * Electron development launcher
 * This script starts both the Angular development server and Electron
 */
const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');

// Clear terminal
console.clear();
console.log('┌─────────────────────────────────────┐');
console.log('│  Power Explorer - Development Mode  │');
console.log('└─────────────────────────────────────┘');

// Kill any existing process on port 4200
try {
  if (process.platform === 'win32') {
    exec('FOR /F "tokens=5" %P IN (\'netstat -ano ^| findstr :4200 ^| findstr LISTENING\') DO taskkill /F /PID %P');
  } else {
    exec('kill $(lsof -t -i:4200) 2>/dev/null || true');
  }
} catch (err) {
  // Ignore errors
}

// Start Angular dev server
console.log('🚀 Starting Angular development server...');
const ngServe = spawn(
  /^win/.test(process.platform) ? 'npm.cmd' : 'npm', 
  ['run', 'start'], 
  { stdio: 'pipe', shell: true }
);

let electronProcess = null;
let angularStarted = false;

// Handle Angular output
ngServe.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // Check if Angular is compiled and ready
  if ((output.includes('Compiled successfully') || 
       output.includes('compiled successfully') ||
       output.includes('Angular Live Development Server is listening')) && 
       !angularStarted) {
    
    angularStarted = true;
    console.log('✅ Angular server is ready');
    console.log('🔧 Compiling Electron TypeScript...');
    
    // Compile TypeScript files
    const tsc = spawn(
      /^win/.test(process.platform) ? 'npm.cmd' : 'npm',
      ['run', 'tsc:electron'],
      { stdio: 'inherit', shell: true }
    );
    
    tsc.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ TypeScript compilation failed');
        return;
      }
      
      console.log('✅ TypeScript compilation completed');
      console.log('🚀 Starting Electron...');
      
      // Set environment variables for development
      const env = {
        ...process.env,
        ELECTRON_START_URL: 'http://localhost:4200/',
        NODE_ENV: 'development',
        BROWSER: 'none',
      };
      
      // Start Electron
      const electron = require('electron');
      electronProcess = spawn(electron, ['.'], {
        stdio: 'inherit',
        env: env
      });
      
      electronProcess.on('close', (code) => {
        console.log(`Electron exited with code ${code}`);
        cleanup();
      });
    });
  }
});

ngServe.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Check if the server is available after a timeout
setTimeout(() => {
  if (!angularStarted) {
    console.log('⏱️ Angular server taking longer than expected. Checking if it\'s available...');
    
    // Make a request to check if server is up
    http.get('http://localhost:4200/', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Angular server is responding');
        angularStarted = true;
        
        // Start Electron
        const tsc = spawn(
          /^win/.test(process.platform) ? 'npm.cmd' : 'npm',
          ['run', 'tsc:electron'],
          { stdio: 'inherit', shell: true }
        );
        
        tsc.on('close', (code) => {
          console.log('✅ TypeScript compilation completed');
          startElectron();
        });
      } else {
        console.log(`❌ Angular server responded with status code: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.log(`❌ Angular server not ready: ${err.message}`);
    });
  }
}, 30000); // Check after 30 seconds

// Start Electron process
function startElectron() {
  // Set environment variables for development
  const env = {
    ...process.env,
    ELECTRON_START_URL: 'http://localhost:4200/',
    NODE_ENV: 'development',
    BROWSER: 'none',
  };
  
  // Start Electron
  console.log('🚀 Starting Electron...');
  const electron = require('electron');
  electronProcess = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: env
  });
  
  electronProcess.on('close', (code) => {
    console.log(`Electron exited with code ${code}`);
    cleanup();
  });
}

// Clean up processes on exit
function cleanup() {
  console.log('🧹 Cleaning up...');
  
  if (electronProcess) {
    electronProcess.kill();
  }
  
  if (ngServe) {
    ngServe.kill();
  }
  
  // Kill any remaining Angular server
  try {
    if (process.platform === 'win32') {
      exec('FOR /F "tokens=5" %P IN (\'netstat -ano ^| findstr :4200 ^| findstr LISTENING\') DO taskkill /F /PID %P');
    } else {
      exec('kill $(lsof -t -i:4200) 2>/dev/null || true');
    }
  } catch (err) {
    // Ignore errors
  }
  
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup); 