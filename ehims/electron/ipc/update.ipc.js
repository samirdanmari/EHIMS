const { ipcMain, shell, app } = require('electron');
const https = require('https');

const GITHUB_OWNER = 'samirdanmari';
const GITHUB_REPO = 'EHIMS';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // check every 1 hour

let mainWindow = null;

/**
 * Compares two semver strings. Returns true if v2 is newer than v1.
 */
function isNewer(currentVersion, latestVersion) {
    const normalize = (v) =>
        v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

    const current = normalize(currentVersion);
    const latest = normalize(latestVersion);
    const len = Math.max(current.length, latest.length);

    for (let i = 0; i < len; i++) {
        const c = current[i] || 0;
        const l = latest[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

/**
 * Fetches the latest release info from GitHub Releases API.
 */
function fetchLatestRelease() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
            method: 'GET',
            headers: {
                'User-Agent': 'EHIMS-Updater',
                Accept: 'application/vnd.github.v3+json',
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch {
                    reject(new Error('Failed to parse GitHub API response'));
                }
            });
        });

        req.on('error', reject);

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('GitHub API request timed out'));
        });

        req.end();
    });
}

/**
 * Checks GitHub for a newer release and notifies the renderer if one exists.
 * Returns the update info object, or null if already up to date.
 */
async function checkForUpdates() {
    try {
        const currentVersion = app.getVersion();
        const release = await fetchLatestRelease();

        if (!release || !release.tag_name) return null;

        const latestVersion = release.tag_name.replace(/^v/, '');

        if (!isNewer(currentVersion, latestVersion)) {
            console.log(`[UpdateIPC] App is up to date (v${currentVersion}).`);
            return null;
        }

        const updateInfo = {
            currentVersion,
            latestVersion,
            releaseUrl: release.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
            releaseName: release.name || `v${latestVersion}`,
            releaseNotes: release.body || '',
            publishedAt: release.published_at || '',
        };

        console.log(`[UpdateIPC] New version available: v${latestVersion} (current: v${currentVersion})`);

        // Push event to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update:available', updateInfo);
        }

        return updateInfo;
    } catch (err) {
        console.error('[UpdateIPC] Error checking for updates:', err.message);
        return null;
    }
}

/**
 * Registers all update-related IPC handlers.
 * @param {BrowserWindow} window - The main application window.
 */
function registerUpdateIPC(window) {
    mainWindow = window;

    // On-demand update check triggered from renderer
    ipcMain.handle('update:check', async () => {
        return await checkForUpdates();
    });

    // Open the GitHub releases page in the default system browser
    ipcMain.handle('update:open-release', async (_event, url) => {
        const targetUrl =
            url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
        await shell.openExternal(targetUrl);
        return true;
    });

    // Auto-check on startup (after 5-second delay to let app settle)
    setTimeout(() => checkForUpdates(), 5000);

    // Auto-check on a recurring interval
    setInterval(() => checkForUpdates(), CHECK_INTERVAL_MS);

    console.log('[UpdateIPC] Update checker registered.');
}

module.exports = { registerUpdateIPC };
