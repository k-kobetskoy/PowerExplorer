/**
 * This is a custom Electron launcher script to prevent browser windows from opening
 * when running the Electron app.
 */

// Set environment variables to prevent browser from opening
process.env.BROWSER = 'none';
process.env.NODE_ENV = 'production'; // This helps prevent development mode behaviors

// Launch Electron directly
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

// Launch the Electron process
const electronProcess = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_NO_ATTACH_CONSOLE: true
  }
});

// Handle exit
electronProcess.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
  process.exit(code);
});

// Handle errors
electronProcess.on('error', (err) => {
  console.error('Failed to start Electron process:', err);
  process.exit(1);
}); 