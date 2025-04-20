const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'src', '.well-known');
const targetDir = path.join(__dirname, 'dist', 'power-explorer', '.well-known');
const fileName = 'microsoft-identity-association.json';

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Copy the file
fs.copyFileSync(
    path.join(sourceDir, fileName),
    path.join(targetDir, fileName)
);

console.log('Identity file copied successfully!'); 