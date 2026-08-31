const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDatabase } = require('./database/connection');
const { runMigrations } = require('./database/migrations');
const { seedDatabase } = require('./database/seed');
const { registerAuthIPC } = require('./ipc/auth.ipc');
const { registerInventoryIPC } = require('./ipc/inventory.ipc');
const { registerSupplierIPC } = require('./ipc/supplier.ipc');
const { registerMenuItemIPC } = require('./ipc/menu.ipc');
const { registerEODIPC } = require('./ipc/eod.ipc');
const { registerUsersIPC } = require('./ipc/users.ipc');
const { registerReportsIPC } = require('./ipc/reports.ipc');
const { registerSettingsIPC } = require('./ipc/settings.ipc');
const { registerPrinterIPC } = require('./ipc/printer.ipc');
const { registerReceiptIPC } = require('./ipc/receipt.ipc');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, '../dist/ehims/browser/index.html'));
    } else {
        mainWindow.loadURL('http://localhost:4200');
    }
}

app.whenReady().then(() => {
    // Initialize Database
    const db = getDatabase();
    runMigrations(db);
    seedDatabase(db);

    // Register IPC Handlers
    registerAuthIPC(db);
    registerInventoryIPC(db);
    registerSupplierIPC(db);
    registerMenuItemIPC(db);
    registerEODIPC(db);
    registerUsersIPC(db);
    registerReportsIPC(db);
    registerSettingsIPC(db);
    registerPrinterIPC(db);
    registerReceiptIPC(db);

    // Generic read-only query handler for Angular renderer
    ipcMain.handle('db:query', async (event, { sql, params = [] }) => {
        try {
            const stmt = db.prepare(sql);
            const rows = stmt.all(...params);
            return { rows, error: null };
        } catch (err) {
            console.error('[db:query] Error:', err.message);
            return { rows: [], error: err.message };
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        const db = getDatabase();
        if (db) {
            db.close();
        }
        app.quit();
    }
});