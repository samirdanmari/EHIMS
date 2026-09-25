const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const DATABASE_NAME = 'ehims.db';
const INSTALLATION_MARKER = '.installation-id';

function getInstallationId() {
    const executableStats = fs.statSync(process.execPath);
    const identity = [
        app.getVersion(),
        process.platform,
        process.arch,
        executableStats.size,
        executableStats.mtimeMs
    ].join('|');

    return crypto.createHash('sha256').update(identity).digest('hex');
}

function resetDatabaseForNewInstallation() {
    if (!app.isPackaged) {
        return;
    }

    const userDataPath = app.getPath('userData');
    const markerPath = path.join(userDataPath, INSTALLATION_MARKER);
    const installationId = getInstallationId();
    let previousInstallationId = null;

    try {
        previousInstallationId = fs.readFileSync(markerPath, 'utf8').trim();
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }

    if (previousInstallationId !== installationId) {
        for (const suffix of ['', '-wal', '-shm']) {
            const databasePath = path.join(userDataPath, `${DATABASE_NAME}${suffix}`);
            fs.rmSync(databasePath, { force: true });
        }
    }

    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(markerPath, installationId, 'utf8');
}

module.exports = { resetDatabaseForNewInstallation };
