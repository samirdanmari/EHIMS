const { ipcMain } = require('electron');

// NOTE: This handler currently covers only what Phase 2 (Inventory) needs —
// a lightweight supplier list for the purchase-entry form. Full supplier
// CRUD, credit ledger, and payment recording are built out in Phase 4.
function registerSupplierIPC(db) {
    ipcMain.handle('supplier:list', async (event, { search = '', includeInactive = false } = {}) => {
        try {
            let sql = `SELECT * FROM suppliers WHERE 1=1`;
            const params = [];
            if (!includeInactive) {
                sql += ` AND is_active = 1`;
            }
            if (search) {
                sql += ` AND name LIKE ?`;
                params.push(`%${search}%`);
            }
            sql += ` ORDER BY name ASC`;

            const rows = db.prepare(sql).all(...params);
            return { success: true, suppliers: rows };
        } catch (err) {
            console.error('[supplier:list] Error:', err.message);
            return { success: false, error: err.message, suppliers: [] };
        }
    });
}

module.exports = { registerSupplierIPC };
