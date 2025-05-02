# Power Explorer

A desktop application built with Angular and Electron for exploring Microsoft Dataverse/Power Platform environments.

## TypeScript Migration for Electron Parts

The Electron parts of the application have been migrated to TypeScript for better type safety and developer experience.

### Project Structure

- `/electron/` - TypeScript source files for Electron
- `/dist-electron/` - Compiled JavaScript files (generated from TypeScript)
- `/dist/` - Compiled Angular application

### Development Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Run in development mode (Angular + Electron with hot reloading):
   ```
   npm run electron-dev
   ```

   This will:
   - Start the Angular development server
   - Watch and compile TypeScript files in the electron directory
   - Launch Electron pointing to the Angular development server

3. Build for production:
   ```
   npm run electron-build
   ```

4. Package the application:
   ```
   npm run package
   ```

### Working with TypeScript in Electron

The TypeScript configuration for Electron is in `tsconfig.electron.json`. The main files include:

- `electron/main.ts` - The main Electron process
- `electron/preload.ts` - The preload script for the renderer process
- `electron/auth-handler.ts` - Handles Microsoft authentication
- `electron/ipc-channels.ts` - Defines IPC channel names
- `electron/types.ts` - Common TypeScript types used across the Electron part

When making changes to the Electron code:
1. Edit the TypeScript files in the `/electron/` directory
2. The TypeScript compiler will automatically watch for changes and recompile when in development mode
3. Electron will reload with the new changes

### Adding New TypeScript Files

When adding new TypeScript files to the Electron part:
1. Place them in the `/electron/` directory
2. Import them using ES module syntax (`import ... from ...`)
3. Export using `export default` or named exports
4. Run `npm run tsc:electron` to compile them
