const { spawn } = require('child_process');
const { join } = require('path');
const { createServer } = require('http');
const { readFileSync } = require('fs');
const waitOn = require('wait-on');

// Check if package.json exists
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json')));
  console.log(`Starting ${packageJson.name} in development mode...`);
} catch (err) {
  console.error('Failed to read package.json:', err);
}

// Angular dev server port
const port = 4200;
const url = `http://localhost:${port}`;

// Environment variables for the Electron process
const env = {
  ...process.env,
  ELECTRON_START_URL: url,
  NODE_ENV: 'development'
};

console.log('Starting Angular dev server...');

// Start Angular dev server
const ngServe = spawn('npm', ['run', 'start'], { 
  shell: true, 
  env, 
  stdio: 'inherit' 
});

// Give some time for Angular to start compiling before checking
setTimeout(() => {
  console.log('Waiting for Angular dev server to be ready...');
  
  // Wait for Angular server to be ready - use TCP check instead of HTTP
  waitOn({
    resources: [`tcp:localhost:${port}`],
    timeout: 120000, // 2 minutes
    interval: 1000,  // Check every second
    verbose: true,
    window: 1000    // Wait 1 second before first check
  }).then(() => {
    console.log('Angular dev server is ready. Starting Electron...');

    // Build Electron TypeScript files
    const tsc = spawn('npm', ['run', 'tsc:electron:watch'], { 
      shell: true, 
      env, 
      stdio: 'inherit' 
    });

    // Start Electron
    const electron = spawn('electron', ['.'], { 
      shell: true, 
      env, 
      stdio: 'inherit' 
    });

    // Handle exit
    electron.on('exit', (code) => {
      console.log(`Electron process exited with code ${code}`);
      ngServe.kill();
      tsc.kill();
      process.exit(code);
    });
  }).catch(err => {
    console.error('Error waiting for Angular dev server:', err);
    ngServe.kill();
    process.exit(1);
  });
}, 5000); // Wait 5 seconds before first check

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('Stopping development environment...');
  ngServe.kill();
  process.exit(0);
}); 