const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');

function registerBackupIPC(db, mainWindow) {
  // ---------------------------------------------------------
  // GET BACKUP INFO
  // Returns DB file path, size, and last-modified timestamp
  // ---------------------------------------------------------
  ipcMain.handle('backup:get-info', async () => {
    try {
      const dbPath = path.join(app.getPath('userData'), 'ehims.db');

      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Database file not found' };
      }

      const stats = fs.statSync(dbPath);

      return {
        success: true,
        data: {
          dbPath,
          fileSizeBytes: stats.size,
          lastModified: stats.mtime.toISOString(),
        },
      };
    } catch (err) {
      console.error('[backup:get-info] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // CREATE LOCAL BACKUP
  // Opens a native Save dialog and copies the DB file there
  // ---------------------------------------------------------
  ipcMain.handle('backup:create-local', async () => {
    try {
      const dbPath = path.join(app.getPath('userData'), 'ehims.db');

      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Database file not found' };
      }

      // Build a default filename with timestamp
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const defaultFileName = `ehims_backup_${timestamp}.db`;

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Backup',
        defaultPath: path.join(app.getPath('downloads'), defaultFileName),
        filters: [
          { name: 'Database Backup', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        buttonLabel: 'Save Backup',
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Backup cancelled' };
      }

      // Flush WAL to the main DB file before copying
      db.pragma('wal_checkpoint(TRUNCATE)');

      fs.copyFileSync(dbPath, filePath);

      console.log('[backup:create-local] Backup saved to:', filePath);
      return { success: true, filePath, message: 'Backup created successfully' };
    } catch (err) {
      console.error('[backup:create-local] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // RESTORE LOCAL BACKUP
  // Opens a native Open dialog, closes the DB, swaps the file,
  // then emits a restart signal to the renderer
  // ---------------------------------------------------------
  ipcMain.handle('backup:restore-local', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Backup File to Restore',
        filters: [
          { name: 'Database Backup', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
        buttonLabel: 'Restore Backup',
      });

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, error: 'Restore cancelled' };
      }

      const backupFilePath = filePaths[0];

      // Basic validation: check the file exists and is non-zero
      if (!fs.existsSync(backupFilePath)) {
        return { success: false, error: 'Selected file does not exist' };
      }

      const stats = fs.statSync(backupFilePath);
      if (stats.size === 0) {
        return { success: false, error: 'Selected file is empty' };
      }

      // Validate SQLite magic bytes (first 16 bytes should start with "SQLite format 3")
      const fd = fs.openSync(backupFilePath, 'r');
      const magicBuffer = Buffer.alloc(16);
      fs.readSync(fd, magicBuffer, 0, 16, 0);
      fs.closeSync(fd);

      const magicString = magicBuffer.toString('utf8', 0, 15);
      if (magicString !== 'SQLite format 3') {
        return { success: false, error: 'Invalid backup file: not a valid SQLite database' };
      }

      const dbPath = path.join(app.getPath('userData'), 'ehims.db');

      // Close the DB before replacing
      db.close();

      // Create a safety copy of the current DB in case restore fails
      const safetyBackupPath = dbPath + '.pre_restore_backup';
      fs.copyFileSync(dbPath, safetyBackupPath);

      try {
        fs.copyFileSync(backupFilePath, dbPath);
        // Remove WAL/SHM files if they exist so SQLite opens cleanly
        [dbPath + '-wal', dbPath + '-shm'].forEach((f) => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
      } catch (copyErr) {
        // Restore the safety copy on failure
        fs.copyFileSync(safetyBackupPath, dbPath);
        fs.unlinkSync(safetyBackupPath);
        console.error('[backup:restore-local] Copy failed, rolled back:', copyErr.message);
        return { success: false, error: 'Failed to restore backup: ' + copyErr.message };
      }

      // Clean up safety copy
      if (fs.existsSync(safetyBackupPath)) {
        fs.unlinkSync(safetyBackupPath);
      }

      console.log('[backup:restore-local] Restore complete from:', backupFilePath);
      return { success: true, message: 'Backup restored successfully. The application will now restart.' };
    } catch (err) {
      console.error('[backup:restore-local] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerBackupIPC };
