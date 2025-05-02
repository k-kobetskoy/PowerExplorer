const fs = require('fs');
const path = require('path');

// Define directories
const sourceDir = path.resolve(__dirname, '../electron/dist');
const targetDir = path.resolve(__dirname, '../dist-electron');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`Created directory: ${targetDir}`);
}

// Copy files
try {
  const files = fs.readdirSync(sourceDir);
  
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied: ${file}`);
      
      // Also copy source map if it exists
      const mapFile = `${file}.map`;
      const sourceMapPath = path.join(sourceDir, mapFile);
      
      if (fs.existsSync(sourceMapPath)) {
        const targetMapPath = path.join(targetDir, mapFile);
        fs.copyFileSync(sourceMapPath, targetMapPath);
        console.log(`Copied: ${mapFile}`);
      }
    }
  });
  
  console.log('Successfully copied all electron files');
} catch (error) {
  console.error('Error copying files:', error);
  process.exit(1);
} 