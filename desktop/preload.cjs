const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronSetup', {
  save: (config) => ipcRenderer.send('setup-save', config),
});

contextBridge.exposeInMainWorld('electronUpdater', {
  onDownloadProgress: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('update-download-progress', listener);
    return () => ipcRenderer.removeListener('update-download-progress', listener);
  },
  onUpdateDownloaded: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  install: () => ipcRenderer.send('update-install'),
});
