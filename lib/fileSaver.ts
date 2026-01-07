// utils/fileSaver.ts
export const saveFileLocally = async (file: File): Promise<{ path: string; isElectron: boolean }> => {
  try {
    // For Electron environment
    if (window.electronAPI) {
      const basePath = 'C:\\ChatApp\\uploads';
      
      // Ensure directory exists
      const dirResult = await window.electronAPI.ensureDirectoryExists(basePath);
      if (!dirResult.success) {
        throw new Error(`Failed to create directory: ${dirResult.error}`);
      }

      // Create safe filename
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');
      const filePath = `${basePath}\\${timestamp}_${safeName}`;

      // Save file
      const buffer = await file.arrayBuffer();
      const saveResult = await window.electronAPI.saveFileElectron({
        filePath,
        buffer: Array.from(new Uint8Array(buffer))
      });

      if (!saveResult.success) {
        throw new Error(`Failed to save file: ${saveResult.error}`);
      }

      return { path: filePath, isElectron: true };
    }

    // Web browser fallback
    const fileKey = `file_${Date.now()}_${file.name}`;
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    
    localStorage.setItem(fileKey, dataUrl);
    return { path: fileKey, isElectron: false };
  } catch (error) {
    console.error('File save error:', error);
    throw error;
  }
};