const { ipcMain } = require('electron');

function registerPrinterIPC(db) {
  // ---------------------------------------------------------
  // LIST AVAILABLE PRINTERS
  // ---------------------------------------------------------
  ipcMain.handle('printer:list-available', async (event) => {
    try {
      // In a real app, you'd use electron-print or similar
      // For now, return mock data
      const printers = [
        { name: 'Printer1', displayName: 'Thermal Printer (USB)', isDefault: true },
        { name: 'Printer2', displayName: 'Office Printer', isDefault: false },
        { name: 'Printer3', displayName: 'Network Printer', isDefault: false },
      ];

      const settings = db.prepare('SELECT default_printer FROM printer_settings LIMIT 1').get();
      
      if (settings && settings.default_printer) {
        printers.forEach(p => {
          p.isDefault = p.name === settings.default_printer;
        });
      }

      return { success: true, data: printers };
    } catch (err) {
      console.error('[printer:list-available] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // TEST PRINT
  // ---------------------------------------------------------
  ipcMain.handle('printer:test-print', async (event, { printerName, content } = {}) => {
    try {
      // In a real app, you'd use electron-print or similar
      // This would send the content to the specified printer
      console.log(`[printer:test-print] Printing to ${printerName || 'default'}:`);
      console.log(content);

      // Simulate successful print
      return { 
        success: true, 
        message: `Test print sent to ${printerName || 'default printer'}` 
      };
    } catch (err) {
      console.error('[printer:test-print] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // GET DEFAULT PRINTER
  // ---------------------------------------------------------
  ipcMain.handle('printer:get-default', async (event) => {
    try {
      const settings = db.prepare('SELECT default_printer FROM printer_settings LIMIT 1').get();
      return { 
        success: true, 
        data: settings ? settings.default_printer : null 
      };
    } catch (err) {
      console.error('[printer:get-default] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerPrinterIPC };
