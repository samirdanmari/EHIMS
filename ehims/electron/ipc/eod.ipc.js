const { ipcMain } = require('electron');

function registerEODIPC(db) {
    // ---------------------------------------------------------
    // SHIFT MANAGEMENT
    // ---------------------------------------------------------
    ipcMain.handle('shift:open', async (event, { shift_name, user_id, opening_cash }) => {
        try {
            if (!shift_name || !shift_name.trim()) {
                return { success: false, error: 'Shift name is required' };
            }
            if (!user_id) {
                return { success: false, error: 'User ID is required' };
            }

            // Check if user has active shift
            const activeShift = db.prepare(`
                SELECT * FROM shifts WHERE user_id = ? AND status = 'active'
            `).get(user_id);

            if (activeShift) {
                return { success: false, error: 'User already has an active shift' };
            }

            const info = db.prepare(`
                INSERT INTO shifts (shift_name, user_id, opening_cash, status)
                VALUES (?, ?, ?, 'active')
            `).run(shift_name.trim(), user_id, opening_cash || 0);

            if (info.changes > 0) {
                const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(info.lastID);
                return { success: true, shift };
            }
            return { success: false, error: 'Failed to create shift' };
        } catch (err) {
            console.error('[shift:open] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('shift:list-active', async (event) => {
        try {
            const shifts = db.prepare(`
                SELECT s.*, u.display_name as user_name
                FROM shifts s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.status = 'active'
                ORDER BY s.start_time DESC
            `).all();
            return { success: true, shifts };
        } catch (err) {
            console.error('[shift:list-active] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('shift:close', async (event, { shift_id, closing_cash, notes }) => {
        try {
            const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift_id);

            if (!shift) {
                return { success: false, error: 'Shift not found' };
            }

            db.prepare(`
                UPDATE shifts 
                SET status = 'closed', closing_cash = ?, notes = ?, end_time = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(closing_cash || 0, notes || '', shift_id);

            const updated = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift_id);
            return { success: true, shift: updated };
        } catch (err) {
            console.error('[shift:close] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // Alias for frontend compatibility
    ipcMain.handle('eod:close-shift', async (event, payload) => {
        try {
            const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(payload.shift_id);

            if (!shift) {
                return { success: false, error: 'Shift not found' };
            }

            db.prepare(`
                UPDATE shifts 
                SET status = 'closed', closing_cash = ?, notes = ?, end_time = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(payload.closing_cash || 0, payload.notes || '', payload.shift_id);

            const updated = db.prepare('SELECT * FROM shifts WHERE id = ?').get(payload.shift_id);
            return { success: true, shift: updated };
        } catch (err) {
            console.error('[eod:close-shift] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('shift:get-current', async (event, { user_id }) => {
        try {
            const shift = db.prepare(`
                SELECT s.*, u.display_name as user_name
                FROM shifts s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.user_id = ? AND s.status = 'active'
            `).get(user_id);

            return shift ? { success: true, shift } : { success: false, error: 'No active shift' };
        } catch (err) {
            console.error('[shift:get-current] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // EOD PROCESS
    // ---------------------------------------------------------
    ipcMain.handle('eod:start', async (event, { shift_id }) => {
        try {
            const shift = db.prepare('SELECT * FROM shifts WHERE id = ? AND status = ?', 'closed').get(shift_id);

            if (!shift) {
                return { success: false, error: 'Closed shift not found' };
            }

            const eodRecord = db.prepare(`
                INSERT INTO end_of_day_records (shift_id, recorded_by, status)
                VALUES (?, ?, 'pending')
            `).run(shift_id, event.sender._id || 0);

            if (eodRecord.changes > 0) {
                const record = db.prepare('SELECT * FROM end_of_day_records WHERE id = ?').get(eodRecord.lastID);
                return { success: true, record };
            }
            return { success: false, error: 'Failed to create EOD record' };
        } catch (err) {
            console.error('[eod:start] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('eod:get-report', async (event, { shift_id }) => {
        try {
            // Get shift data
            const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift_id);
            if (!shift) {
                return { success: false, error: 'Shift not found' };
            }

            // Get orders summary
            const orders = db.prepare(`
                SELECT o.* FROM orders o
                WHERE o.shift_id = ? AND o.status = 'completed'
                ORDER BY o.created_at ASC
            `).all(shift_id);

            const summary = db.prepare(`
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(total_amount), 0) as total_sales,
                    COALESCE(SUM(discount_amount), 0) as total_discounts,
                    COALESCE(SUM(tax_amount), 0) as total_tax
                FROM orders
                WHERE shift_id = ? AND status = 'completed'
            `).get(shift_id);

            // Get supplier payments
            const supplier_payments = db.prepare(`
                SELECT sp.* FROM supplier_payments sp
                WHERE DATE(sp.payment_date) = DATE(?)
            `).all(shift.end_time);

            return {
                success: true,
                report: {
                    shift,
                    orders,
                    summary,
                    supplier_payments
                }
            };
        } catch (err) {
            console.error('[eod:get-report] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('eod:complete', async (event, { eod_record_id, actual_cash, variance_amount, notes }) => {
        try {
            db.prepare(`
                UPDATE end_of_day_records
                SET status = 'completed', actual_cash = ?, variance_amount = ?, notes = ?, completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(actual_cash || 0, variance_amount || 0, notes || '', eod_record_id);

            const record = db.prepare('SELECT * FROM end_of_day_records WHERE id = ?').get(eod_record_id);
            return { success: true, record };
        } catch (err) {
            console.error('[eod:complete] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('eod:list', async (event, { shift_id = null }) => {
        try {
            let sql = 'SELECT * FROM end_of_day_records WHERE 1=1';
            const params = [];

            if (shift_id) {
                sql += ' AND shift_id = ?';
                params.push(shift_id);
            }

            sql += ' ORDER BY created_at DESC';
            const records = db.prepare(sql).all(...params);
            return { success: true, records };
        } catch (err) {
            console.error('[eod:list] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // SHIFT HANDOVER
    // ---------------------------------------------------------
    ipcMain.handle('eod:create-handover', async (event, { from_shift_id, to_shift_id, notes }) => {
        try {
            const info = db.prepare(`
                INSERT INTO shift_handovers (from_shift_id, to_shift_id, notes, status)
                VALUES (?, ?, ?, 'pending')
            `).run(from_shift_id, to_shift_id, notes || '');

            if (info.changes > 0) {
                const handover = db.prepare('SELECT * FROM shift_handovers WHERE id = ?').get(info.lastID);
                return { success: true, handover };
            }
            return { success: false, error: 'Failed to create handover' };
        } catch (err) {
            console.error('[eod:create-handover] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('eod:get-handover', async (event, { handover_id }) => {
        try {
            const handover = db.prepare('SELECT * FROM shift_handovers WHERE id = ?').get(handover_id);
            if (!handover) {
                return { success: false, error: 'Handover not found' };
            }
            return { success: true, handover };
        } catch (err) {
            console.error('[eod:get-handover] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('eod:sign-handover', async (event, { handover_id, signature, is_incoming }) => {
        try {
            const field = is_incoming ? 'incoming_signature' : 'outgoing_signature';
            db.prepare(`UPDATE shift_handovers SET ${field} = ? WHERE id = ?`).run(signature, handover_id);

            const updated = db.prepare('SELECT * FROM shift_handovers WHERE id = ?').get(handover_id);
            return { success: true, handover: updated };
        } catch (err) {
            console.error('[eod:sign-handover] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // GET ALL CLOSED SHIFTS WITH DETAILS (FOR ADMIN REPORTING)
    // ---------------------------------------------------------
    ipcMain.handle('eod:list-closed-shifts', async (event, { limit = 50, dateFrom = null, dateTo = null, user_id = null } = {}) => {
        try {
            let sql = `
                SELECT 
                    s.id,
                    s.shift_name,
                    s.user_id,
                    s.start_time,
                    s.end_time,
                    DATE(s.end_time) as shift_date,
                    s.opening_cash,
                    s.closing_cash,
                    s.status,
                    s.notes,
                    COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), 'Unknown Staff') as user_name,
                    COALESCE(u.username, '') as username,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE shift_id = s.id AND status = 'completed') as total_sales,
                    (SELECT COUNT(*) FROM orders WHERE shift_id = s.id AND status = 'completed') as total_orders,
                    (SELECT COALESCE(SUM(amount), 0) FROM supplier_payments WHERE CAST(payment_date as date) = CAST(s.end_time as date)) as supplier_payments
                FROM shifts s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.status = 'closed'
            `;
            const params = [];

            if (dateFrom) {
                sql += ` AND DATE(s.end_time) >= ?`;
                params.push(dateFrom);
            }
            if (dateTo) {
                sql += ` AND DATE(s.end_time) <= ?`;
                params.push(dateTo);
            }
            if (user_id) {
                sql += ` AND s.user_id = ?`;
                params.push(user_id);
            }

            sql += ` ORDER BY DATE(s.end_time) DESC, s.shift_name ASC, s.end_time DESC LIMIT ?`;
            params.push(limit);

            const rows = db.prepare(sql).all(...params);
            return { success: true, shifts: rows };
        } catch (err) {
            console.error('[eod:list-closed-shifts] Error:', err.message);
            return { success: false, error: err.message, shifts: [] };
        }
    });

    // ---------------------------------------------------------
    // GET SHIFT DETAILS WITH SUMMARY
    // ---------------------------------------------------------
    ipcMain.handle('eod:get-shift-detail', async (event, { shift_id }) => {
        try {
            const shift = db.prepare(`
                SELECT 
                    s.*,
                    u.display_name as user_name
                FROM shifts s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.id = ?
            `).get(shift_id);

            if (!shift) {
                return { success: false, error: 'Shift not found' };
            }

            // Get all orders for this shift
            const orders = db.prepare(`
                SELECT * FROM orders
                WHERE shift_id = ? AND status = 'completed'
                ORDER BY created_at DESC
            `).all(shift_id);

            const getOrderItems = db.prepare(`
                SELECT oi.quantity, oi.unit_price, oi.total_price, oi.notes,
                       m.name as menu_item_name
                FROM order_items oi
                LEFT JOIN menu_items m ON m.id = oi.menu_item_id
                WHERE oi.order_id = ?
                ORDER BY oi.id
            `);
            orders.forEach((order) => {
                order.order_items = getOrderItems.all(order.id);
            });

            // Get summary
            const summary = db.prepare(`
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(total_amount), 0) as total_sales,
                    COALESCE(SUM(discount_amount), 0) as total_discounts,
                    COALESCE(SUM(tax_amount), 0) as total_tax
                FROM orders
                WHERE shift_id = ? AND status = 'completed'
            `).get(shift_id);

            return {
                success: true,
                data: {
                    shift,
                    orders,
                    summary
                }
            };
        } catch (err) {
            console.error('[eod:get-shift-detail] Error:', err.message);
            return { success: false, error: err.message };
        }
    });
}

module.exports = { registerEODIPC };