

contextBridge.exposeInMainWorld('electronAPI', {
  ensureDirectoryExists: (path) => ipcRenderer.invoke('ensure-directory-exists', path),
  saveFileElectron: (data) => ipcRenderer.invoke('save-file-electron', data),
  checkFileExists: (path) => ipcRenderer.invoke('check-file-exists', path),
  // ... keep other existing APIs
});