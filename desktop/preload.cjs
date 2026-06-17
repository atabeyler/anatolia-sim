const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronSetup', {
  save: (config) => ipcRenderer.send('setup-save', config),
});
