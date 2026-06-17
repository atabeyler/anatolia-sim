import { contextBridge, ipcRenderer } from 'electron';

// Expose only the specific IPC channels the setup page needs.
// The main app window doesn't use this preload.
contextBridge.exposeInMainWorld('electronSetup', {
  save: (config) => ipcRenderer.send('setup-save', config),
});
