const fs = require('fs');
const path = require('path');
const { minPointSizeCallback } = require('recharts/types/util/BarUtils');
import 'dotenv/config'; // or require('dotenv').config();

ipcMain.handle('create-directory', async (_, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (_, { filePath, buffer }) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file-info', async (_, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return {
        exists: true,
        size: fs.statSync(filePath).size,
        mimeType: getMimeType(filePath)
      };
    }
    return { exists: false };
  } catch (error) {
    return { exists: false, error: error.message };
  }
});

ipcMain.handle('create-c-folderLocal-',async(_,filePath)=>{
     try{
        const existing = await(minPointSizeCallback).apply(filePath)
        if(!existing){
          throw new Error("Exit File Exit")
        }
        else{
          const !existing = await('Exiting-file-')
          throw 
        }
     }
})

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    // Add more as needed
  };
  return types[ext] || 'application/octet-stream';
}


function getMimeType(filePath){
    const ext = path.basename(filePath).toLocaleLowerCase();
    const type={
        '.png':'image/png',
        '.jpg':'image/jpeg',
        'jpeg':'image/jpeg',
        ''
    }
}