const { ipcMain } = require('electron');

function registerInventoryIPC(db) {
    // ---------------------------------------------------------
    // CATEGORIES
    // ---------------------------------------------------------
    ipcMain.handle('inventory:list-categories', async () => {
        try {
            const rows = db.prepare(
                `SELECT * FROM categories WHERE type IN ('inventory','both') ORDER BY name ASC`
            ).all();
            return { success: true, categories: rows };
        } catch (err) {
            console.error('[inventory:list-categories] Error:', err.message);
            return { success: false, error: err.message, categories: [] };
        }
    });

    // ---------------------------------------------------------
    // INVENTORY ITEMS
    // ---------------------------------------------------------
    ipcMain.handle('inventory:list-items', async (event, { search = '', categoryId = null, onlyLowStock = false, includeInactive = false } = {}) => {
        try {
            let sql = `
                SELECT i.*, c.name as category_name
                FROM inventory_items i
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE 1=1
            `;
            const params = [];

            if (!includeInactive) {
                sql += ` AND i.is_active = 1`;
            }
            if (search) {
                sql += ` AND i.name LIKE ?`;
                params.push(`%${search}%`);
            }
            if (categoryId) {
                sql += ` AND i.category_id = ?`;
                params.push(categoryId);
            }
            if (onlyLowStock) {
                sql += ` AND i.current_stock <= i.low_stock_threshold`;
            }
            sql += ` ORDER BY i.name ASC`;

            const rows = db.prepare(sql).all(...params);
            return { success: true, items: rows };
        } catch (err) {
            console.error('[inventory:list-items] Error:', err.message);
            return { success: false, error: err.message, items: [] };
        }
    });

    ipcMain.handle('inventory:create-item', async (event, { name, category_id, unit, cost_price, opening_stock, low_stock_threshold }) => {
        try {
            if (!name || !name.trim()) {
                return { success: false, error: 'Item name is required' };
            }
            const stock = Number(opening_stock) || 0;
            const info = db.prepare(`
                INSERT INTO inventory_items (name, category_id, unit, cost_price, opening_stock, current_stock, low_stock_threshold)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                name.trim(),
                category_id || null,
                unit || 'pcs',
                Number(cost_price) || 0,
                stock,
                stock,
                Number(low_stock_threshold) || 5
            );
            const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(info.lastInsertRowid);
            return { success: true, item };
        } catch (err) {
            console.error('[inventory:create-item] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('inventory:update-item', async (event, { id, name, category_id, unit, cost_price, low_stock_threshold, is_active }) => {
        try {
            const existing = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
            if (!existing) {
                return { success: false, error: 'Item not found' };
            }
            db.prepare(`
                UPDATE inventory_items
                SET name = ?, category_id = ?, unit = ?, cost_price = ?, low_stock_threshold = ?, is_active = ?, updated_at = datetime('now','localtime')
                WHERE id = ?
            `).run(
                name?.trim() || existing.name,
                category_id ?? existing.category_id,
                unit || existing.unit,
                Number(cost_price ?? existing.cost_price),
                Number(low_stock_threshold ?? existing.low_stock_threshold),
                is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
                id
            );
            const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
            return { success: true, item };
        } catch (err) {
            console.error('[inventory:update-item] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('inventory:delete-item', async (event, { id }) => {
        try {
            // Soft delete — preserves purchase/issuance history integrity
            db.prepare(`UPDATE inventory_items SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?`).run(id);
            return { success: true };
        } catch (err) {
            console.error('[inventory:delete-item] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // PURCHASE ENTRIES
    // ---------------------------------------------------------
    ipcMain.handle('inventory:create-purchase', async (event, { supplier_id, payment_method, is_credit, received_by, notes, items }) => {
        try {
            if (!items || items.length === 0) {
                return { success: false, error: 'At least one item is required' };
            }
            if (!received_by) {
                return { success: false, error: 'received_by is required' };
            }

            const insertPurchase = db.prepare(`
                INSERT INTO purchase_entries (supplier_id, item_id, quantity, unit_cost, total_cost, payment_method, is_credit, received_by, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const updateStock = db.prepare(`
                UPDATE inventory_items SET current_stock = current_stock + ?, updated_at = datetime('now','localtime') WHERE id = ?
            `);
            const updateSupplierBalance = db.prepare(`
                UPDATE suppliers SET credit_balance = credit_balance + ?, updated_at = datetime('now','localtime') WHERE id = ?
            `);

            const runTransaction = db.transaction((purchaseItems) => {
                let grandTotal = 0;
                const createdIds = [];
                for (const it of purchaseItems) {
                    const quantity = Number(it.quantity);
                    const unitCost = Number(it.unit_cost);
                    if (!it.item_id || !(quantity > 0) || unitCost < 0) {
                        throw new Error('Invalid item, quantity, or cost in purchase');
                    }
                    const totalCost = quantity * unitCost;
                    const info = insertPurchase.run(
                        supplier_id || null,
                        it.item_id,
                        quantity,
                        unitCost,
                        totalCost,
                        payment_method || 'cash',
                        is_credit ? 1 : 0,
                        received_by,
                        notes || null
                    );
                    updateStock.run(quantity, it.item_id);
                    createdIds.push(info.lastInsertRowid);
                    grandTotal += totalCost;
                }
                if (is_credit && supplier_id) {
                    updateSupplierBalance.run(grandTotal, supplier_id);
                }
                return { createdIds, grandTotal };
            });

            const result = runTransaction(items);
            return { success: true, ...result };
        } catch (err) {
            console.error('[inventory:create-purchase] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('inventory:list-purchases', async (event, { limit = 50, supplierId = null, dateFrom = null, dateTo = null } = {}) => {
        try {
            let sql = `
                SELECT p.*, i.name as item_name, i.unit as item_unit,
                       s.name as supplier_name, u.display_name as received_by_name
                FROM purchase_entries p
                LEFT JOIN inventory_items i ON p.item_id = i.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                LEFT JOIN users u ON p.received_by = u.id
                WHERE 1=1
            `;
            const params = [];
            if (supplierId) {
                sql += ` AND p.supplier_id = ?`;
                params.push(supplierId);
            }
            if (dateFrom) {
                sql += ` AND date(p.purchase_date) >= date(?)`;
                params.push(dateFrom);
            }
            if (dateTo) {
                sql += ` AND date(p.purchase_date) <= date(?)`;
                params.push(dateTo);
            }
            sql += ` ORDER BY p.purchase_date DESC LIMIT ?`;
            params.push(limit);

            const rows = db.prepare(sql).all(...params);
            return { success: true, purchases: rows };
        } catch (err) {
            console.error('[inventory:list-purchases] Error:', err.message);
            return { success: false, error: err.message, purchases: [] };
        }
    });

    // ---------------------------------------------------------
    // STOCK ISSUANCE
    // ---------------------------------------------------------
    ipcMain.handle('inventory:list-active-shifts', async () => {
        try {
            const rows = db.prepare(`
                SELECT sh.*, u.display_name as user_name
                FROM shifts sh
                LEFT JOIN users u ON sh.user_id = u.id
                WHERE sh.status = 'active'
                ORDER BY sh.start_time DESC
            `).all();
            return { success: true, shifts: rows };
        } catch (err) {
            console.error('[inventory:list-active-shifts] Error:', err.message);
            return { success: false, error: err.message, shifts: [] };
        }
    });

    ipcMain.handle('inventory:create-issuance', async (event, { shift_id, issued_by, received_by, notes, items }) => {
        try {
            if (!items || items.length === 0) {
                return { success: false, error: 'At least one item is required' };
            }
            if (!shift_id || !issued_by || !received_by) {
                return { success: false, error: 'shift_id, issued_by, and received_by are required' };
            }

            const getItem = db.prepare('SELECT * FROM inventory_items WHERE id = ?');
            const insertIssuance = db.prepare(`
                INSERT INTO stock_issuances (shift_id, issued_by, received_by, notes)
                VALUES (?, ?, ?, ?)
            `);
            const insertIssuanceItem = db.prepare(`
                INSERT INTO stock_issuance_items (issuance_id, item_id, quantity, unit_cost, total_cost)
                VALUES (?, ?, ?, ?, ?)
            `);
            const updateStock = db.prepare(`
                UPDATE inventory_items SET current_stock = current_stock - ?, updated_at = datetime('now','localtime') WHERE id = ?
            `);

            const runTransaction = db.transaction((issuanceItems) => {
                // Pre-validate stock availability before mutating anything
                for (const it of issuanceItems) {
                    const item = getItem.get(it.item_id);
                    if (!item) {
                        throw new Error(`Item ${it.item_id} not found`);
                    }
                    const quantity = Number(it.quantity);
                    if (!(quantity > 0)) {
                        throw new Error(`Invalid quantity for ${item.name}`);
                    }
                    if (quantity > item.current_stock) {
                        throw new Error(`Insufficient stock for ${item.name}: available ${item.current_stock}, requested ${quantity}`);
                    }
                }

                const issuanceInfo = insertIssuance.run(shift_id, issued_by, received_by, notes || null);
                const issuanceId = issuanceInfo.lastInsertRowid;

                for (const it of issuanceItems) {
                    const item = getItem.get(it.item_id);
                    const quantity = Number(it.quantity);
                    const unitCost = item.cost_price;
                    const totalCost = quantity * unitCost;
                    insertIssuanceItem.run(issuanceId, it.item_id, quantity, unitCost, totalCost);
                    updateStock.run(quantity, it.item_id);
                }

                return { issuanceId };
            });

            const result = runTransaction(items);
            return { success: true, ...result };
        } catch (err) {
            console.error('[inventory:create-issuance] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('inventory:list-issuances', async (event, { limit = 50, dateFrom = null, dateTo = null } = {}) => {
        try {
            let sql = `
                SELECT si.*, sh.shift_name,
                       ub.display_name as issued_by_name,
                       ur.display_name as received_by_name,
                       (SELECT COUNT(*) FROM stock_issuance_items sii WHERE sii.issuance_id = si.id) as item_count,
                       (SELECT COALESCE(SUM(sii.total_cost),0) FROM stock_issuance_items sii WHERE sii.issuance_id = si.id) as total_cost
                FROM stock_issuances si
                LEFT JOIN shifts sh ON si.shift_id = sh.id
                LEFT JOIN users ub ON si.issued_by = ub.id
                LEFT JOIN users ur ON si.received_by = ur.id
                WHERE 1=1
            `;
            const params = [];
            if (dateFrom) {
                sql += ` AND date(si.issued_at) >= date(?)`;
                params.push(dateFrom);
            }
            if (dateTo) {
                sql += ` AND date(si.issued_at) <= date(?)`;
                params.push(dateTo);
            }
            sql += ` ORDER BY si.issued_at DESC LIMIT ?`;
            params.push(limit);

            const rows = db.prepare(sql).all(...params);
            return { success: true, issuances: rows };
        } catch (err) {
            console.error('[inventory:list-issuances] Error:', err.message);
            return { success: false, error: err.message, issuances: [] };
        }
    });

    ipcMain.handle('inventory:get-issuance-items', async (event, { issuance_id }) => {
        try {
            const rows = db.prepare(`
                SELECT sii.*, i.name as item_name, i.unit as item_unit
                FROM stock_issuance_items sii
                LEFT JOIN inventory_items i ON sii.item_id = i.id
                WHERE sii.issuance_id = ?
            `).all(issuance_id);
            return { success: true, items: rows };
        } catch (err) {
            console.error('[inventory:get-issuance-items] Error:', err.message);
            return { success: false, error: err.message, items: [] };
        }
    });

    // ---------------------------------------------------------
    // STOCK AUDIT
    // ---------------------------------------------------------
    // Note: EHIMS does not store daily stock snapshots, so "opening" and
    // "closing" balances for a period are derived from the item's live
    // current_stock plus/minus movements inside the selected range. This
    // is exact when the range runs up to today, and an approximation for
    // fully historical ranges.
    ipcMain.handle('inventory:stock-audit', async (event, { dateFrom, dateTo, categoryId = null } = {}) => {
        try {
            let sql = `
                SELECT i.id, i.name, i.unit, i.current_stock, i.low_stock_threshold, c.name as category_name
                FROM inventory_items i
                LEFT JOIN categories c ON i.category_id = c.id
                WHERE i.is_active = 1
            `;
            const params = [];
            if (categoryId) {
                sql += ` AND i.category_id = ?`;
                params.push(categoryId);
            }
            sql += ` ORDER BY i.name ASC`;

            const items = db.prepare(sql).all(...params);

            const purchasedStmt = db.prepare(`
                SELECT COALESCE(SUM(quantity),0) as qty FROM purchase_entries
                WHERE item_id = ? AND date(purchase_date) >= date(?) AND date(purchase_date) <= date(?)
            `);
            const issuedStmt = db.prepare(`
                SELECT COALESCE(SUM(sii.quantity),0) as qty
                FROM stock_issuance_items sii
                JOIN stock_issuances si ON sii.issuance_id = si.id
                WHERE sii.item_id = ? AND date(si.issued_at) >= date(?) AND date(si.issued_at) <= date(?)
            `);

            const report = items.map(item => {
                const purchased = purchasedStmt.get(item.id, dateFrom, dateTo).qty;
                const issued = issuedStmt.get(item.id, dateFrom, dateTo).qty;
                const closing = item.current_stock;
                const opening = closing - purchased + issued;
                return {
                    item_id: item.id,
                    name: item.name,
                    unit: item.unit,
                    category_name: item.category_name,
                    low_stock_threshold: item.low_stock_threshold,
                    opening,
                    purchased,
                    issued,
                    closing
                };
            });

            return { success: true, report };
        } catch (err) {
            console.error('[inventory:stock-audit] Error:', err.message);
            return { success: false, error: err.message, report: [] };
        }
    });
}

module.exports = { registerInventoryIPC };