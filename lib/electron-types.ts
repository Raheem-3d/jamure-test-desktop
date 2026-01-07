// Type definitions for Electron API
declare global {
  interface Window {
    electronAPI?: {
      moveToSpecificFolder: (
        fileName: string,
        fileBlob: Blob,
      ) => Promise<{ success: boolean; path?: string; error?: string }>
      selectDownloadFolder: () => Promise<string | null>
      openFolder: (path: string) => Promise<void>
      getDownloadPath: () => Promise<string>
    }
  }
}

export {}
