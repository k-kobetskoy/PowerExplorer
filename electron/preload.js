const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    send: (channel, data) => {
      // whitelist channels
      let validChannels = ['app-ready'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel, func) => {
      let validChannels = ['deep-link'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    auth: {
      login: (environmentUrl, userConfig) => ipcRenderer.invoke('login', environmentUrl, userConfig),
      getToken: (scopes, environmentUrl, userConfig) => ipcRenderer.invoke('getToken', scopes, environmentUrl, userConfig),
      logout: () => ipcRenderer.invoke('logout'),
      setEnvironmentUrl: (environmentUrl) => ipcRenderer.invoke('setEnvironmentUrl', environmentUrl)
    },
    isElectron: true
  }
); 