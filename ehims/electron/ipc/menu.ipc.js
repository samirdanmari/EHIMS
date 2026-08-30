const { ipcMain } = require('electron');

function registerMenuItemIPC(db) {
    // ---------------------------------------------------------
    // CATEGORIES
    // ---------------------------------------------------------
    ipcMain.handle('menu:list-categories', async (event) => {
        try {
            const rows = db.prepare(`
                SELECT id, name FROM categories WHERE type IN ('menu', 'both') ORDER BY name ASC
            `).all();
            return { success: true, categories: rows };
        } catch (err) {
            console.error('[menu:list-categories] Error:', err.message);
            return { success: false, error: err.message, categories: [] };
        }
    });

    ipcMain.handle('menu:create-category', async (event, { name }) => {
        try {
            if (!name || !name.trim()) {
                return { success: false, error: 'Category name is required' };
            }

            const info = db.prepare(`
                INSERT INTO categories (name, type) VALUES (?, 'menu')
            `).run(name.trim());

            if (info.changes > 0) {
                return { success: true, category: { id: info.lastID, name: name.trim() } };
            }
            return { success: false, error: 'Failed to create category' };
        } catch (err) {
            console.error('[menu:create-category] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // MENU ITEMS
    // ---------------------------------------------------------
    ipcMain.handle('menu:list-items', async (event, { search = '', categoryId = null, onlyAvailable = true } = {}) => {
        try {
            let sql = `
                SELECT m.*, c.name as category_name, i.name as inventory_name, i.current_stock
                FROM menu_items m
                LEFT JOIN categories c ON m.category_id = c.id
                LEFT JOIN inventory_items i ON m.inventory_item_id = i.id
                WHERE 1=1
            `;
            const params = [];

            if (onlyAvailable) {
                sql += ` AND m.is_available = 1`;
            }
            if (search) {
                sql += ` AND m.name LIKE ?`;
                params.push(`%${search}%`);
            }
            if (categoryId) {
                sql += ` AND m.category_id = ?`;
                params.push(categoryId);
            }
            sql += ` ORDER BY m.name ASC`;

            const rows = db.prepare(sql).all(...params);
            return { success: true, items: rows };
        } catch (err) {
            console.error('[menu:list-items] Error:', err.message);
            return { success: false, error: err.message, items: [] };
        }
    });

    ipcMain.handle('menu:get-item-details', async (event, { id }) => {
        try {
            const item = db.prepare(`
                SELECT m.*, c.name as category_name, i.name as inventory_name, i.current_stock
                FROM menu_items m
                LEFT JOIN categories c ON m.category_id = c.id
                LEFT JOIN inventory_items i ON m.inventory_item_id = i.id
                WHERE m.id = ?
            `).get(id);

            if (!item) {
                return { success: false, error: 'Menu item not found' };
            }

            // Get all associated inventory items
            const inventoryItems = db.prepare(`
                SELECT ii.id, ii.name, ii.current_stock, mii.quantity
                FROM menu_item_inventory mii
                JOIN inventory_items ii ON mii.inventory_item_id = ii.id
                WHERE mii.menu_item_id = ?
                ORDER BY ii.name ASC
            `).all(id);

            return { 
                success: true, 
                item, 
                inventoryItems: inventoryItems || [] 
            };
        } catch (err) {
            console.error('[menu:get-item-details] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('menu:create-item', async (event, { name, category_id, selling_price, inventory_item_id, inventory_item_ids, description }) => {
        try {
            if (!name || !name.trim()) {
                return { success: false, error: 'Menu item name is required' };
            }
            if (!(selling_price > 0)) {
                return { success: false, error: 'Selling price must be greater than 0' };
            }

            const transaction = db.transaction(() => {
                const info = db.prepare(`
                    INSERT INTO menu_items (name, category_id, selling_price, inventory_item_id, description)
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    name.trim(),
                    category_id || null,
                    Number(selling_price),
                    inventory_item_id || null,
                    description || null
                );

                // Insert multiple inventory items if provided
                if (inventory_item_ids && Array.isArray(inventory_item_ids) && inventory_item_ids.length > 0) {
                    const insertStmt = db.prepare(`
                        INSERT OR IGNORE INTO menu_item_inventory (menu_item_id, inventory_item_id, quantity)
                        VALUES (?, ?, 1)
                    `);
                    
                    for (const invItemId of inventory_item_ids) {
                        insertStmt.run(info.lastInsertRowid, invItemId);
                    }
                }

                return info.lastInsertRowid;
            });

            const itemId = transaction();
            const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(itemId);
            return { success: true, item };
        } catch (err) {
            console.error('[menu:create-item] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('menu:update-item', async (event, { id, name, category_id, selling_price, inventory_item_id, inventory_item_ids, description, is_available }) => {
        try {
            const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
            if (!existing) {
                return { success: false, error: 'Menu item not found' };
            }

            const transaction = db.transaction(() => {
                db.prepare(`
                    UPDATE menu_items
                    SET name = ?, category_id = ?, selling_price = ?, inventory_item_id = ?, 
                        description = ?, is_available = ?, updated_at = datetime('now','localtime')
                    WHERE id = ?
                `).run(
                    name?.trim() || existing.name,
                    category_id ?? existing.category_id,
                    Number(selling_price ?? existing.selling_price),
                    inventory_item_id ?? existing.inventory_item_id,
                    description ?? existing.description,
                    is_available !== undefined ? (is_available ? 1 : 0) : existing.is_available,
                    id
                );

                // Update multiple inventory items if provided
                if (inventory_item_ids && Array.isArray(inventory_item_ids)) {
                    // Delete existing associations
                    db.prepare('DELETE FROM menu_item_inventory WHERE menu_item_id = ?').run(id);
                    
                    // Insert new associations
                    if (inventory_item_ids.length > 0) {
                        const insertStmt = db.prepare(`
                            INSERT INTO menu_item_inventory (menu_item_id, inventory_item_id, quantity)
                            VALUES (?, ?, 1)
                        `);
                        
                        for (const invItemId of inventory_item_ids) {
                            insertStmt.run(id, invItemId);
                        }
                    }
                }
            });

            transaction();

            const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
            return { success: true, item };
        } catch (err) {
            console.error('[menu:update-item] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('menu:delete-item', async (event, { id }) => {
        try {
            // Soft delete
            db.prepare(`UPDATE menu_items SET is_available = 0, updated_at = datetime('now','localtime') WHERE id = ?`).run(id);
            return { success: true };
        } catch (err) {
            console.error('[menu:delete-item] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // ORDERS
    // ---------------------------------------------------------
    ipcMain.handle('order:create', async (event, { shift_id, cashier_id, waiter_id, table_number, items, discount_amount, tax_amount, payment_method, notes }) => {
        try {
            if (!shift_id || !cashier_id) {
                return { success: false, error: 'shift_id and cashier_id are required' };
            }
            if (!items || items.length === 0) {
                return { success: false, error: 'At least one item is required' };
            }

            // Validate all items exist and have valid pricing
            const getItem = db.prepare('SELECT * FROM menu_items WHERE id = ?');
            let subtotal = 0;
            for (const it of items) {
                const menuItem = getItem.get(it.menu_item_id);
                if (!menuItem) {
                    throw new Error(`Menu item ${it.menu_item_id} not found`);
                }
                const qty = Number(it.quantity);
                if (!(qty > 0)) {
                    throw new Error(`Invalid quantity for ${menuItem.name}`);
                }
                subtotal += qty * menuItem.selling_price;
            }

            const discountAmt = Number(discount_amount) || 0;
            const taxAmt = Number(tax_amount) || 0;
            const totalAmount = Math.max(0, subtotal - discountAmt) + taxAmt;

            // Generate order number: ORD-TIMESTAMP-RANDOM
            const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            const insertOrder = db.prepare(`
                INSERT INTO orders (order_number, shift_id, cashier_id, waiter_id, table_number, 
                    subtotal, discount_amount, tax_amount, total_amount, payment_method, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertOrderItem = db.prepare(`
                INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            const updateStockIssuance = db.prepare(`
                INSERT INTO stock_issuance_items (issuance_id, item_id, quantity, unit_cost, total_cost)
                VALUES (?, ?, ?, ?, ?)
            `);

            const decrementInventory = db.prepare(`
                UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?
            `);

            const runTransaction = db.transaction((orderItems) => {
                // Create order
                const orderInfo = insertOrder.run(
                    orderNumber,
                    shift_id,
                    cashier_id,
                    waiter_id || null,
                    table_number || null,
                    subtotal,
                    discountAmt,
                    taxAmt,
                    totalAmount,
                    payment_method || 'cash',
                    'completed' // Assume order is completed immediately (for restaurant workflow)
                );
                const orderId = orderInfo.lastInsertRowid;

                // Add order items and update inventory
                for (const it of orderItems) {
                    const menuItem = getItem.get(it.menu_item_id);
                    const qty = Number(it.quantity);
                    insertOrderItem.run(
                        orderId,
                        it.menu_item_id,
                        qty,
                        menuItem.selling_price,
                        qty * menuItem.selling_price,
                        it.notes || null
                    );

                    // If tied to inventory, deduct stock
                    if (menuItem.inventory_item_id) {
                        const inventory = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(menuItem.inventory_item_id);
                        if (inventory && inventory.current_stock < qty) {
                            throw new Error(`Insufficient stock for ${menuItem.name}: have ${inventory.current_stock}, need ${qty}`);
                        }
                        decrementInventory.run(qty, menuItem.inventory_item_id);
                    }
                }

                return { orderId, orderNumber, totalAmount };
            });

            const result = runTransaction(items);
            return { success: true, ...result };
        } catch (err) {
            console.error('[order:create] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('order:list', async (event, { limit = 50, shiftId = null, status = null, dateFrom = null, dateTo = null } = {}) => {
        try {
            let sql = `
                SELECT o.*, s.shift_name, 
                       uc.display_name as cashier_name,
                       uw.display_name as waiter_name,
                       (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
                FROM orders o
                LEFT JOIN shifts s ON o.shift_id = s.id
                LEFT JOIN users uc ON o.cashier_id = uc.id
                LEFT JOIN users uw ON o.waiter_id = uw.id
                WHERE 1=1
            `;
            const params = [];

            if (shiftId) {
                sql += ` AND o.shift_id = ?`;
                params.push(shiftId);
            }
            if (status) {
                sql += ` AND o.status = ?`;
                params.push(status);
            }
            if (dateFrom) {
                sql += ` AND date(o.created_at) >= date(?)`;
                params.push(dateFrom);
            }
            if (dateTo) {
                sql += ` AND date(o.created_at) <= date(?)`;
                params.push(dateTo);
            }
            sql += ` ORDER BY o.created_at DESC LIMIT ?`;
            params.push(limit);

            const rows = db.prepare(sql).all(...params);
            return { success: true, orders: rows };
        } catch (err) {
            console.error('[order:list] Error:', err.message);
            return { success: false, error: err.message, orders: [] };
        }
    });

    ipcMain.handle('order:get-details', async (event, { order_id }) => {
        try {
            const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
            if (!order) {
                return { success: false, error: 'Order not found' };
            }

            const items = db.prepare(`
                SELECT oi.*, m.name as menu_item_name, m.image_path
                FROM order_items oi
                LEFT JOIN menu_items m ON oi.menu_item_id = m.id
                WHERE oi.order_id = ?
            `).all(order_id);

            return { success: true, order, items };
        } catch (err) {
            console.error('[order:get-details] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('order:void', async (event, { order_id, void_reason, void_approved_by }) => {
        try {
            const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
            if (!order) {
                return { success: false, error: 'Order not found' };
            }
            if (order.status === 'voided') {
                return { success: false, error: 'Order is already voided' };
            }

            const runTransaction = db.transaction(() => {
                // Update order status
                db.prepare(`
                    UPDATE orders 
                    SET status = 'voided', void_reason = ?, void_approved_by = ?, updated_at = datetime('now','localtime')
                    WHERE id = ?
                `).run(void_reason || null, void_approved_by || null, order_id);

                // Reverse inventory deductions
                const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order_id);
                for (const oi of orderItems) {
                    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(oi.menu_item_id);
                    if (menuItem && menuItem.inventory_item_id) {
                        db.prepare(`
                            UPDATE inventory_items 
                            SET current_stock = current_stock + ? 
                            WHERE id = ?
                        `).run(oi.quantity, menuItem.inventory_item_id);
                    }
                }

                return true;
            });

            runTransaction();
            return { success: true };
        } catch (err) {
            console.error('[order:void] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('order:apply-discount', async (event, { order_id, discount_amount, discount_reason, approved_by }) => {
        try {
            const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
            if (!order) {
                return { success: false, error: 'Order not found' };
            }

            const newTotalAmount = Math.max(0, order.subtotal - Number(discount_amount)) + order.tax_amount;

            db.prepare(`
                UPDATE orders 
                SET discount_amount = ?, discount_reason = ?, discount_approved_by = ?, 
                    total_amount = ?, updated_at = datetime('now','localtime')
                WHERE id = ?
            `).run(
                Number(discount_amount),
                discount_reason || null,
                approved_by || null,
                newTotalAmount,
                order_id
            );

            const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
            return { success: true, order: updated };
        } catch (err) {
            console.error('[order:apply-discount] Error:', err.message);
            return { success: false, error: err.message };
        }
    });
}

module.exports = { registerMenuItemIPC };