const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { resetDatabaseForNewInstallation } = require('./database/installation');
const { getDatabase } = require('./database/connection');
const { runMigrations } = require('./database/migrations');
const { seedDatabase, seedSampleOrders } = require('./database/seed');
const { registerAuthIPC } = require('./ipc/auth.ipc');
const { registerInventoryIPC } = require('./ipc/Inventory.ipc');
const { registerSupplierIPC } = require('./ipc/Supplier.ipc');
const { registerMenuItemIPC } = require('./ipc/menu.ipc');
const { registerEODIPC } = require('./ipc/eod.ipc');
const { registerUsersIPC } = require('./ipc/users.ipc');
const { registerReportsIPC } = require('./ipc/reports.ipc');
const { registerSettingsIPC } = require('./ipc/settings.ipc');
const { registerPrinterIPC } = require('./ipc/printer.ipc');
const { registerReceiptIPC } = require('./ipc/receipt.ipc');
const { registerSuspendedOrdersIPC } = require('./ipc/suspended-orders.ipc');
const { registerCustomerIPC } = require('./ipc/customer.ipc');
const { registerBackupIPC } = require('./ipc/backup.ipc');
const { registerUpdateIPC } = require('./ipc/update.ipc');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 700,
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
    resetDatabaseForNewInstallation();

    // Initialize Database
    const db = getDatabase();
    runMigrations(db);
    seedDatabase(db);
    if (!app.isPackaged) {
        seedSampleOrders(db);
    }
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
    registerSuspendedOrdersIPC(db);
    registerCustomerIPC(db);
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

    // Register backup IPC after createWindow so mainWindow is available for dialogs
    registerBackupIPC(db, mainWindow);

    // Register update IPC after createWindow so mainWindow is available for push events
    registerUpdateIPC(mainWindow);

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
