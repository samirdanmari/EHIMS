const { ipcMain, BrowserWindow } = require('electron');

function registerPrinterIPC(db) {
  // ---------------------------------------------------------
  // LIST AVAILABLE PRINTERS (REAL DETECTION)
  // ---------------------------------------------------------
  ipcMain.handle('printer:list-available', async (event) => {
    try {
      if (event.sender.isDestroyed()) {
        console.log('[printer:list-available] Requesting webContents was destroyed');
        return { success: false, error: 'No window available', data: [] };
      }

      const printers = await event.sender.getPrintersAsync();
      
      if (!printers || printers.length === 0) {
        console.log('[printer:list-available] No printers found on system');
        return { 
          success: true, 
          data: [],
          message: 'No printers detected. Please connect a printer.' 
        };
      }

      // Get default printer from settings
      const settings = db.prepare('SELECT default_printer FROM printer_settings LIMIT 1').get();
      const defaultPrinter = settings?.default_printer;

      // Map to simple format
      const printerList = printers.map(printer => ({
        name: printer.name,
        displayName: printer.displayName || printer.name,
        isDefault: printer.isDefault || printer.name === defaultPrinter,
        description: printer.description || ''
      }));

      console.log('[printer:list-available] Found printers:', printerList.map(p => p.name).join(', '));

      return { 
        success: true, 
        data: printerList,
        message: `Found ${printerList.length} printer(s)` 
      };
    } catch (err) {
      console.error('[printer:list-available] Error:', err.message);
      return { 
        success: false, 
        error: err.message,
        data: [],
        suggestion: 'Make sure printer is connected and drivers are installed'
      };
    }
  });

  // ---------------------------------------------------------
  // GET DEFAULT PRINTER
  // ---------------------------------------------------------
  ipcMain.handle('printer:get-default', async (event) => {
    try {
      const settings = db.prepare('SELECT default_printer FROM printer_settings LIMIT 1').get();
      const defaultPrinter = settings?.default_printer;

      if (!defaultPrinter) {
        return { success: false, error: 'No default printer configured' };
      }

      return { success: true, data: defaultPrinter };
    } catch (err) {
      console.error('[printer:get-default] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // TEST PRINT (with better error handling)
  // ---------------------------------------------------------
  ipcMain.handle('printer:test-print', async (event, { printerName, content = '' }) => {
    try {
      if (!printerName) {
        return { success: false, error: 'Printer name is required' };
      }

      if (event.sender.isDestroyed()) {
        return { success: false, error: 'No window available for printing' };
      }

      // Verify printer exists
      const printers = await event.sender.getPrintersAsync();
      const printerExists = printers.some(p => p.name === printerName);

      if (!printerExists) {
        return { 
          success: false, 
          error: `Printer "${printerName}" not found or disconnected`,
          availablePrinters: printers.map(p => p.name)
        };
      }

      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      try {
        const html = `<!doctype html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                @page { margin: 0; }
                body {
                  width: 80mm;
                  margin: 0;
                  padding: 8px;
                  color: #000;
                  background: #fff;
                  font-family: "Courier New", monospace;
                  font-size: 12px;
                  white-space: pre-wrap;
                }
              </style>
            </head>
            <body>${escapeHtml(content || 'Printer test\n\nThis is a test receipt.')}</body>
          </html>`;

        await printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

        const printResult = await new Promise((resolve) => {
          printWindow.webContents.print(
            {
              silent: true,
              deviceName: printerName,
              margins: { marginType: 'none' }
            },
            (success, failureReason) => resolve({ success, failureReason })
          );
        });

        if (!printResult.success) {
          return {
            success: false,
            error: printResult.failureReason || `Could not print to "${printerName}"`
          };
        }
      } finally {
        if (!printWindow.isDestroyed()) {
          printWindow.close();
        }
      }

      return { 
        success: true, 
        message: `Test page sent to ${printerName}.` 
      };
    } catch (err) {
      console.error('[printer:test-print] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { registerPrinterIPC };
