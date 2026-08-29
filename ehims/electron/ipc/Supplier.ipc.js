const { ipcMain } = require('electron');

function registerSupplierIPC(db) {
    // ---------------------------------------------------------
    // SUPPLIERS - CRUD
    // ---------------------------------------------------------
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

    ipcMain.handle('supplier:get', async (event, { id }) => {
        try {
            const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
            if (!supplier) {
                return { success: false, error: 'Supplier not found' };
            }
            return { success: true, supplier };
        } catch (err) {
            console.error('[supplier:get] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('supplier:create', async (event, { name, contact_person, phone, email, address, payment_terms }) => {
        try {
            if (!name || !name.trim()) {
                return { success: false, error: 'Supplier name is required' };
            }

            const info = db.prepare(`
                INSERT INTO suppliers (name, contact_person, phone, email, address, payment_terms)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                name.trim(),
                contact_person || null,
                phone || null,
                email || null,
                address || null,
                payment_terms || 'Net30'
            );

            const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid);
            return { success: true, supplier };
        } catch (err) {
            console.error('[supplier:create] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('supplier:update', async (event, { id, name, contact_person, phone, email, address, payment_terms, is_active }) => {
        try {
            const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
            if (!existing) {
                return { success: false, error: 'Supplier not found' };
            }

            db.prepare(`
                UPDATE suppliers
                SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, 
                    payment_terms = ?, is_active = ?, updated_at = datetime('now','localtime')
                WHERE id = ?
            `).run(
                name?.trim() || existing.name,
                contact_person ?? existing.contact_person,
                phone ?? existing.phone,
                email ?? existing.email,
                address ?? existing.address,
                payment_terms ?? existing.payment_terms,
                is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
                id
            );

            const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
            return { success: true, supplier };
        } catch (err) {
            console.error('[supplier:update] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('supplier:deactivate', async (event, { id }) => {
        try {
            db.prepare(`UPDATE suppliers SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?`).run(id);
            return { success: true };
        } catch (err) {
            console.error('[supplier:deactivate] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // SUPPLIER PAYMENTS
    // ---------------------------------------------------------
    ipcMain.handle('supplier:record-payment', async (event, { supplier_id, amount, payment_method, reference_number, recorded_by, notes }) => {
        try {
            if (!supplier_id || !(amount > 0)) {
                return { success: false, error: 'supplier_id and amount are required' };
            }

            const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplier_id);
            if (!supplier) {
                return { success: false, error: 'Supplier not found' };
            }

            const info = db.prepare(`
                INSERT INTO supplier_payments (supplier_id, amount, payment_method, reference_number, recorded_by, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                supplier_id,
                Number(amount),
                payment_method || 'cash',
                reference_number || null,
                recorded_by,
                notes || null
            );

            // Reduce supplier credit balance
            db.prepare(`
                UPDATE suppliers 
                SET credit_balance = CASE 
                    WHEN credit_balance - ? < 0 THEN 0 
                    ELSE credit_balance - ? 
                END
                WHERE id = ?
            `).run(amount, amount, supplier_id);

            const payment = db.prepare('SELECT * FROM supplier_payments WHERE id = ?').get(info.lastInsertRowid);
            return { success: true, payment };
        } catch (err) {
            console.error('[supplier:record-payment] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('supplier:payment-history', async (event, { supplier_id, limit = 50 }) => {
        try {
            let sql = `
                SELECT sp.*, u.display_name as recorded_by_name
                FROM supplier_payments sp
                LEFT JOIN users u ON sp.recorded_by = u.id
                WHERE 1=1
            `;
            const params = [];

            if (supplier_id) {
                sql += ` AND sp.supplier_id = ?`;
                params.push(supplier_id);
            }
            sql += ` ORDER BY sp.payment_date DESC LIMIT ?`;
            params.push(limit);

            const rows = db.prepare(sql).all(...params);
            return { success: true, payments: rows };
        } catch (err) {
            console.error('[supplier:payment-history] Error:', err.message);
            return { success: false, error: err.message, payments: [] };
        }
    });

    ipcMain.handle('supplier:credit-summary', async (event, { supplier_id }) => {
        try {
            const supplier = db.prepare('SELECT credit_balance FROM suppliers WHERE id = ?').get(supplier_id);
            if (!supplier) {
                return { success: false, error: 'Supplier not found' };
            }

            const totalOutstanding = db.prepare(`
                SELECT COALESCE(SUM(total_cost), 0) as total
                FROM purchase_entries
                WHERE supplier_id = ? AND is_credit = 1
            `).get(supplier_id).total;

            const totalPaid = db.prepare(`
                SELECT COALESCE(SUM(amount), 0) as total
                FROM supplier_payments
                WHERE supplier_id = ?
            `).get(supplier_id).total;

            const remaining = Math.max(0, totalOutstanding - totalPaid);

            return {
                success: true,
                credit_summary: {
                    total_credit_purchases: totalOutstanding,
                    total_payments: totalPaid,
                    remaining_balance: remaining,
                    current_balance: supplier.credit_balance,
                }
            };
        } catch (err) {
            console.error('[supplier:credit-summary] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // SUPPLIER DETAILS WITH ITEMS SUPPLIED
    // ---------------------------------------------------------
    ipcMain.handle('supplier:get-with-items', async (event, { supplier_id }) => {
        try {
            const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplier_id);
            if (!supplier) {
                return { success: false, error: 'Supplier not found' };
            }

            // Get all purchases from this supplier
            const purchases = db.prepare(`
                SELECT 
                    pe.id,
                    pe.purchase_date,
                    pe.total_cost,
                    GROUP_CONCAT(pi.item_id || ':' || pi.quantity || ':' || i.name || ':' || pi.unit_cost, '|') as items
                FROM purchase_entries pe
                LEFT JOIN purchase_entry_items pi ON pe.id = pi.entry_id
                LEFT JOIN inventory_items i ON pi.item_id = i.id
                WHERE pe.supplier_id = ?
                GROUP BY pe.id
                ORDER BY pe.purchase_date DESC
            `).all(supplier_id);

            // Get all payments made to this supplier
            const payments = db.prepare(`
                SELECT * FROM supplier_payments
                WHERE supplier_id = ?
                ORDER BY payment_date DESC
            `).all(supplier_id);

            return {
                success: true,
                data: {
                    supplier,
                    purchases,
                    payments
                }
            };
        } catch (err) {
            console.error('[supplier:get-with-items] Error:', err.message);
            return { success: false, error: err.message };
        }
    });
}

module.exports = { registerSupplierIPC };