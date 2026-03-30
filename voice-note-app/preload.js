const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  generateArticle: (transcript) => ipcRenderer.invoke('generate-article', transcript),
});
