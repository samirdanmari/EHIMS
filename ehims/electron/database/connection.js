const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');

let dbInstance = null;

function getDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'ehims.db');

    // Create db instance
    dbInstance = new Database(dbPath, {
        verbose: app.isPackaged ? null : console.log
    });

    // Enable Write-Ahead Logging for better concurrent performance
    dbInstance.pragma('journal_mode = WAL');
    
    // Enable foreign keys
    dbInstance.pragma('foreign_keys = ON');

    return dbInstance;
}

module.exports = { getDatabase };
