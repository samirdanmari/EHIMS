const { ipcMain } = require('electron');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash) ||
        crypto.createHash('sha256').update(password).digest('hex') === hash;
}

function registerUsersIPC(db) {
    // ---------------------------------------------------------
    // USERS - CRUD
    // ---------------------------------------------------------
    ipcMain.handle('users:list', async (event, { search = '', includeInactive = false } = {}) => {
        try {
            let sql = `
                SELECT id, username, display_name, role, is_active, created_at
                FROM users
                WHERE 1=1
            `;
            const params = [];

            if (!includeInactive) {
                sql += ` AND is_active = 1`;
            }
            if (search) {
                sql += ` AND (username LIKE ? OR display_name LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`);
            }
            sql += ` ORDER BY display_name ASC`;

            const rows = db.prepare(sql).all(...params);
            return { success: true, users: rows };
        } catch (err) {
            console.error('[users:list] Error:', err.message);
            return { success: false, error: err.message, users: [] };
        }
    });

    ipcMain.handle('users:get', async (event, { id }) => {
        try {
            const user = db.prepare(`
                SELECT id, username, display_name, role, is_active, created_at, updated_at
                FROM users WHERE id = ?
            `).get(id);

            if (!user) {
                return { success: false, error: 'User not found' };
            }

            // Get last login
            const lastSession = db.prepare(`
                SELECT login_at FROM sessions WHERE user_id = ? ORDER BY login_at DESC LIMIT 1
            `).get(id);

            return { success: true, user: { ...user, last_login: lastSession?.login_at } };
        } catch (err) {
            console.error('[users:get] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('users:create', async (event, { username, display_name, password, role }) => {
        try {
            if (!username || !username.trim()) {
                return { success: false, error: 'Username is required' };
            }
            if (!display_name || !display_name.trim()) {
                return { success: false, error: 'Display name is required' };
            }
            if (!password || password.length < 6) {
                return { success: false, error: 'Password must be at least 6 characters' };
            }
            if (!['admin', 'manager', 'storekeeper', 'cashier', 'waiter'].includes(role)) {
                return { success: false, error: 'Invalid role' };
            }

            // Check if username exists
            const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
            if (existing) {
                return { success: false, error: 'Username already exists' };
            }

            const passwordHash = hashPassword(password);
            const info = db.prepare(`
                INSERT INTO users (username, display_name, password_hash, role)
                VALUES (?, ?, ?, ?)
            `).run(username.trim(), display_name.trim(), passwordHash, role);

            const user = db.prepare('SELECT id, username, display_name, role, is_active, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
            return { success: true, user };
        } catch (err) {
            console.error('[users:create] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('users:update', async (event, { id, display_name, role, is_active }) => {
        try {
            const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
            if (!existing) {
                return { success: false, error: 'User not found' };
            }

            // Prevent deactivating self
            // (In a real app, you'd get the current user from session)
            const updates = [];
            const values = [];

            if (display_name !== undefined) {
                updates.push('display_name = ?');
                values.push(display_name.trim());
            }
            if (role !== undefined && ['admin', 'manager', 'storekeeper', 'cashier', 'waiter'].includes(role)) {
                updates.push('role = ?');
                values.push(role);
            }
            if (is_active !== undefined) {
                updates.push('is_active = ?');
                values.push(is_active ? 1 : 0);
            }

            if (updates.length === 0) {
                return { success: false, error: 'No updates provided' };
            }

            updates.push("updated_at = datetime('now','localtime')");
            values.push(id);

            const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            db.prepare(sql).run(...values);

            const user = db.prepare('SELECT id, username, display_name, role, is_active, created_at, updated_at FROM users WHERE id = ?').get(id);
            return { success: true, user };
        } catch (err) {
            console.error('[users:update] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('users:change-password', async (event, { user_id, old_password, new_password }) => {
        try {
            if (!new_password || new_password.length < 6) {
                return { success: false, error: 'Password must be at least 6 characters' };
            }

            const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user_id);
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            // Verify old password
            if (!verifyPassword(old_password, user.password_hash)) {
                return { success: false, error: 'Current password is incorrect' };
            }

            // Update password
            const newHash = hashPassword(new_password);
            db.prepare(`
                UPDATE users
                SET password_hash = ?, updated_at = datetime('now','localtime')
                WHERE id = ?
            `).run(newHash, user_id);

            return { success: true };
        } catch (err) {
            console.error('[users:change-password] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('users:reset-password', async (event, { user_id, new_password }) => {
        try {
            if (!new_password || new_password.length < 6) {
                return { success: false, error: 'Password must be at least 6 characters' };
            }

            const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            const newHash = hashPassword(new_password);
            db.prepare(`
                UPDATE users
                SET password_hash = ?, updated_at = datetime('now','localtime')
                WHERE id = ?
            `).run(newHash, user_id);

            return { success: true };
        } catch (err) {
            console.error('[users:reset-password] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('users:deactivate', async (event, { id }) => {
        try {
            const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(id);
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            db.prepare(`UPDATE users SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?`).run(id);
            return { success: true };
        } catch (err) {
            console.error('[users:deactivate] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // ROLES
    // ---------------------------------------------------------
    ipcMain.handle('roles:list', async (event) => {
        try {
            const roles = [
                { name: 'admin', label: 'Administrator', description: 'Full system access, all features' },
                { name: 'manager', label: 'Manager', description: 'Manage inventory, suppliers, EOD, users' },
                { name: 'storekeeper', label: 'Store Keeper', description: 'Manage inventory, purchases, stock' },
                { name: 'cashier', label: 'Cashier', description: 'Place orders, process payments' },
                { name: 'waiter', label: 'Waiter', description: 'View menu, place orders' }
            ];
            return { success: true, roles };
        } catch (err) {
            console.error('[roles:list] Error:', err.message);
            return { success: false, error: err.message, roles: [] };
        }
    });

    // ---------------------------------------------------------
    // USER ACTIVITY LOG (optional, for audit trail)
    // ---------------------------------------------------------
    ipcMain.handle('users:get-activity', async (event, { user_id, limit = 50 }) => {
        try {
            // For now, just show session history
            const sessions = db.prepare(`
                SELECT login_at, logout_at FROM sessions
                WHERE user_id = ?
                ORDER BY login_at DESC
                LIMIT ?
            `).all(user_id, limit);

            return { success: true, activity: sessions };
        } catch (err) {
            console.error('[users:get-activity] Error:', err.message);
            return { success: false, error: err.message, activity: [] };
        }
    });
}

module.exports = { registerUsersIPC };