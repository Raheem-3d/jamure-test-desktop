

// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // trigger normal http(s) download
  downloadFile: (payload) => ipcRenderer.send('download-file', payload),

  // save blob (renderer => main, returns promise)
  saveBlob: (payload) => ipcRenderer.invoke('save-blob', payload),

  // subscribe to progress/done — return unsubscribe function
   onDownloadProgress: (cb) => {
    const handler = (e, data) => cb(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
 onDownloadDone: (cb) => {
    const handler = (e, data) => cb(data);
    ipcRenderer.on('download-done', handler);
    return () => ipcRenderer.removeListener('download-done', handler);
  },
  onDownloadStarted: (cb) => {
    const handler = (event, data) => cb(data);
    ipcRenderer.on('download-started', handler);
    return () => ipcRenderer.removeListener('download-started', handler);
  },

  // notification helper with message metadata
  notify: (title, body, icon, metadata = {}) => {
    ipcRenderer.send("show-notification", { 
      title, 
      body, 
      icon,
      senderName: metadata.senderName,
      messagePreview: metadata.messagePreview,
      messageId: metadata.messageId,
      channelId: metadata.channelId,
      userId: metadata.userId,
    });
  },

  // trigger a high-priority buzz from renderer -> main (restore/flash + notify)
  buzz: (payload) => {
    ipcRenderer.send('buzz', payload || {});
  },
//
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
  // -------- Updater bridge --------
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onChecking: (cb) => {
      const h = (e, d) => cb(d);
      ipcRenderer.on('updater:checking', h);
      return () => ipcRenderer.removeListener('updater:checking', h);
    },
    onAvailable: (cb) => {
      const h = (e, info) => cb(info);
      ipcRenderer.on('updater:available', h);
      return () => ipcRenderer.removeListener('updater:available', h);
    },
    onNotAvailable: (cb) => {
      const h = (e, info) => cb(info);
      ipcRenderer.on('updater:not-available', h);
      return () => ipcRenderer.removeListener('updater:not-available', h);
    },
    onDownloadProgress: (cb) => {
      const h = (e, progress) => cb(progress);
      ipcRenderer.on('updater:download-progress', h);
      return () => ipcRenderer.removeListener('updater:download-progress', h);
    },
    onDownloaded: (cb) => {
      const h = (e, info) => cb(info);
      ipcRenderer.on('updater:downloaded', h);
      return () => ipcRenderer.removeListener('updater:downloaded', h);
    },
    onError: (cb) => {
      const h = (e, err) => cb(err);
      ipcRenderer.on('updater:error', h);
      return () => ipcRenderer.removeListener('updater:error', h);
    }
  },


  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  copyImage: (imageUrl) => ipcRenderer.invoke('copy-image', imageUrl),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  isElectron: true,
  platform: process.platform,
  
    // expose a way for the renderer to tell main "I'm ready"
  signalReady: () => ipcRenderer.send('renderer-ready'),
});

