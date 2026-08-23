const { ipcMain } = require('electron');
const bcrypt = require('bcryptjs');

function registerAuthIPC(db) {
    ipcMain.handle('auth:login', async (event, { username, password }) => {
        const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
        
        if (!user) {
            throw new Error('Invalid username or password');
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        
        if (!validPassword) {
            throw new Error('Invalid username or password');
        }

        const info = db.prepare('INSERT INTO sessions (user_id) VALUES (?)').run(user.id);
        
        const { password_hash, ...userWithoutPassword } = user;
        
        return {
            user: userWithoutPassword,
            sessionId: info.lastInsertRowid
        };
    });

    ipcMain.handle('auth:logout', async (event, { sessionId }) => {
        db.prepare('UPDATE sessions SET logout_at = datetime("now", "localtime") WHERE id = ?').run(sessionId);
        return true;
    });

    ipcMain.handle('auth:get-current-user', async (event, { sessionId }) => {
        const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND logout_at IS NULL').get(sessionId);
        
        if (!session) {
            return null;
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(session.user_id);
        
        if (!user) {
            return null;
        }
        
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });

    ipcMain.handle('auth:verify-pin', async (event, { pin }) => {
        const users = db.prepare('SELECT * FROM users WHERE role IN ("admin", "manager") AND is_active = 1 AND pin = ?').all(pin);
        
        if (users.length > 0) {
            const { password_hash, ...userWithoutPassword } = users[0];
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
