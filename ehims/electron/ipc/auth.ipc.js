const { ipcMain } = require('electron');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
    setSessionForSender,
    getSessionForSender,
    clearSessionForSender,
} = require('../session-context');

function verifyPassword(password, storedHash) {
    if (bcrypt.compareSync(password, storedHash)) {
        return { valid: true, legacy: false };
    }

    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    return { valid: legacyHash === storedHash, legacy: legacyHash === storedHash };
}

function registerAuthIPC(db) {
    const getUserPermissions = (userId) => db.prepare(
        'SELECT permission FROM user_permissions WHERE user_id = ? ORDER BY permission'
    ).all(userId).map(row => row.permission);

    ipcMain.handle('auth:login', async (event, { username, password }) => {
        try {
            const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

            if (!user) {
                return { success: false, error: 'Invalid username or password' };
            }

            const passwordResult = verifyPassword(password, user.password_hash);

            if (!passwordResult.valid) {
                return { success: false, error: 'Invalid username or password' };
            }

            if (passwordResult.legacy) {
                const upgradedHash = bcrypt.hashSync(password, 10);
                db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?")
                    .run(upgradedHash, user.id);
            }

            const info = db.prepare('INSERT INTO sessions (user_id) VALUES (?)').run(user.id);
            setSessionForSender(event.sender.id, info.lastInsertRowid);

            const { password_hash, ...userWithoutPassword } = user;
            userWithoutPassword.permissions = getUserPermissions(user.id);

            return {
                success: true,
                user: userWithoutPassword,
                session_id: info.lastInsertRowid
            };
        } catch (err) {
            console.error('[auth:login] Error:', err.message);
            return { success: false, error: 'Login failed due to a server error' };
        }
    });

    ipcMain.handle('auth:logout', async (event) => {
        const sessionId = getSessionForSender(event.sender.id);
        if (sessionId) {
            db.prepare("UPDATE sessions SET logout_at = datetime('now','localtime') WHERE id = ?").run(sessionId);
        }
        clearSessionForSender(event.sender.id);
        return true;
    });

    ipcMain.handle('auth:get-current-user', async (event, { session_id }) => {
        const activeSessionId = getSessionForSender(event.sender.id);
        if (!activeSessionId || Number(activeSessionId) !== Number(session_id)) {
            return null;
        }
        const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND logout_at IS NULL').get(session_id);
        
        if (!session) {
            return null;
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(session.user_id);
        
        if (!user) {
            return null;
        }
        
        const { password_hash, ...userWithoutPassword } = user;
        userWithoutPassword.permissions = getUserPermissions(user.id);
        return userWithoutPassword;
    });

    ipcMain.handle('auth:verify-pin', async (event, { pin }) => {
        const users = db.prepare('SELECT * FROM users WHERE role IN ("admin", "manager") AND is_active = 1 AND pin = ?').all(pin);
        
        if (users.length > 0) {
            const { password_hash, ...userWithoutPassword } = users[0];
            userWithoutPassword.permissions = getUserPermissions(users[0].id);
            return { valid: true, user: userWithoutPassword };
        }
        
        return { valid: false, user: null };
    });

    ipcMain.handle('auth:change-password', async (event, { userId, oldPassword, newPassword }) => {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        const validPassword = bcrypt.compareSync(oldPassword, user.password_hash);
        
        if (!validPassword) {
            throw new Error('Invalid old password');
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
        
        return true;
    });
}

module.exports = { registerAuthIPC };