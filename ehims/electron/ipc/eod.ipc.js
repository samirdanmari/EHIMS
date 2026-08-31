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
            return { success: false, error: err.message, shifts: [] };
        }
    });

    // ---------------------------------------------------------
    // SHIFT HANDOVER
    // ---------------------------------------------------------
    ipcMain.handle('eod:close-shift', async (event, { shift_id, drawer_cash, expected_cash, stock_verified, notes, outgoing_user, incoming_user }) => {
        try {
            if (!shift_id) {
                return { success: false, error: 'shift_id is required' };
            }

            const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift_id);
            if (!shift) {
                return { success: false, error: 'Shift not found' };
            }
            if (shift.status !== 'active') {
                return { success: false, error: 'Shift is not active' };
            }

            const runTransaction = db.transaction(() => {
                // Close the shift
                db.prepare(`
                    UPDATE shifts
                    SET status = 'closed', end_time = datetime('now','localtime')
                    WHERE id = ?
                `).run(shift_id);

                // Create handover record
                const variance = expected_cash > 0 ? drawer_cash - expected_cash : 0;
                const handoverInfo = db.prepare(`
                    INSERT INTO shift_handovers (shift_id, outgoing_user, incoming_user, drawer_cash, expected_cash, variance, stock_verified, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    shift_id,
                    outgoing_user,
                    incoming_user || null,
                    drawer_cash || 0,
                    expected_cash || 0,
                    variance,
                    stock_verified ? 1 : 0,
                    notes || null
                );

                // Generate EOD report
                const today = new Date().toISOString().slice(0, 10);
                const reportDate = today;

                // Calculate sales (from orders in this shift)
                const orders = db.prepare(`
                    SELECT SUM(total_amount) as total, 
                           SUM(CASE WHEN status != 'voided' THEN 1 ELSE 0 END) as count,
                           SUM(CASE WHEN payment_method = 'cash' AND status != 'voided' THEN total_amount ELSE 0 END) as cash_collected,
                           SUM(CASE WHEN payment_method = 'card' AND status != 'voided' THEN total_amount ELSE 0 END) as card_collected,
                           SUM(CASE WHEN payment_method = 'transfer' AND status != 'voided' THEN total_amount ELSE 0 END) as transfer_collected,
                           SUM(CASE WHEN status = 'voided' THEN total_amount ELSE 0 END) as voided_amount,
                           SUM(discount_amount) as total_discounts
                    FROM orders WHERE shift_id = ?
                `).get(shift_id);

                const totalSales = orders.total || 0;
                const totalOrders = orders.count || 0;
                const cashCollected = orders.cash_collected || 0;
                const cardCollected = orders.card_collected || 0;
                const transferCollected = orders.transfer_collected || 0;
                const totalVoids = orders.voided_amount || 0;
                const totalDiscounts = orders.total_discounts || 0;

                // Calculate COGS (cost of goods sold from stock issued in shift)
                const issuances = db.prepare(`
                    SELECT SUM(sii.total_cost) as total_cost
                    FROM stock_issuance_items sii
                    JOIN stock_issuances si ON sii.issuance_id = si.id
                    WHERE si.shift_id = ?
                `).get(shift_id);

                const totalCOGS = issuances.total_cost || 0;

                // Find low stock items (below threshold)
                const lowStockItems = db.prepare(`
                    SELECT GROUP_CONCAT(name, ', ') as items
                    FROM inventory_items
                    WHERE current_stock <= low_stock_threshold AND is_active = 1
                `).get().items || '';

                // Calculate totals
                const grossProfit = totalSales - totalCOGS;
                const netProfit = grossProfit - totalDiscounts;

                // Calculate total purchases (for reference - by date, not shift)
                const purchases = db.prepare(`
                    SELECT SUM(total_cost) as total FROM purchase_entries WHERE DATE(purchase_date) = ?
                `).get(reportDate);
                const totalPurchases = purchases.total || 0;

                // Check if report exists, update or create
                const existingReport = db.prepare('SELECT id FROM eod_reports WHERE report_date = ?').get(reportDate);

                if (existingReport) {
                    db.prepare(`
                        UPDATE eod_reports
                        SET total_sales = ?, total_cogs = ?, gross_profit = ?, total_discounts = ?,
                            total_voids = ?, net_profit = ?, total_orders = ?, total_purchases = ?,
                            cash_collected = ?, card_collected = ?, transfer_collected = ?,
                            low_stock_items = ?, generated_by = ?, generated_at = datetime('now','localtime'), notes = ?
                        WHERE report_date = ?
                    `).run(
                        totalSales, totalCOGS, grossProfit, totalDiscounts,
                        totalVoids, netProfit, totalOrders, totalPurchases,
                        cashCollected, cardCollected, transferCollected,
                        lowStockItems, outgoing_user, notes, reportDate
                    );
                } else {
                    db.prepare(`
                        INSERT INTO eod_reports (report_date, total_sales, total_cogs, gross_profit, total_discounts,
                            total_voids, net_profit, total_orders, total_purchases, cash_collected, card_collected,
                            transfer_collected, low_stock_items, generated_by, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        reportDate, totalSales, totalCOGS, grossProfit, totalDiscounts,
                        totalVoids, netProfit, totalOrders, totalPurchases, cashCollected, cardCollected,
                        transferCollected, lowStockItems, outgoing_user, notes
                    );
                }

                return {
                    handoverId: handoverInfo.lastInsertRowid,
                    eodReport: {
                        date: reportDate,
                        totalSales,
                        totalCOGS,
                        grossProfit,
                        totalDiscounts,
                        totalVoids,
                        netProfit,
                        totalOrders,
                        totalPurchases,
                        cashCollected,
                        cardCollected,
                        transferCollected,
                        variance,
                    }
                };
            });

            const result = runTransaction();
            return { success: true, ...result };
        } catch (err) {
            console.error('[eod:close-shift] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // ---------------------------------------------------------
    // EOD REPORTS
    // ---------------------------------------------------------
    ipcMain.handle('eod:get-report', async (event, { report_date }) => {
        try {
            const report = db.prepare(`
                SELECT er.*, u.display_name as generated_by_name
                FROM eod_reports er
                LEFT JOIN users u ON er.generated_by = u.id
                WHERE er.report_date = ?
            `).get(report_date);

            if (!report) {
                return { success: false, error: 'Report not found' };
            }

            return { success: true, report };
        } catch (err) {
            console.error('[eod:get-report] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('eod:list-reports', async (event, { limit = 30, dateFrom = null, dateTo = null } = {}) => {
        try {
            let sql = `
                SELECT er.*, u.display_name as generated_by_name
                FROM eod_reports er
                LEFT JOIN users u ON er.generated_by = u.id
                WHERE 1=1
            `;
            const params = [];

            if (dateFrom) {
                sql += ` AND er.report_date >= ?`;
                params.push(dateFrom);
            }
            if (dateTo) {
                sql += ` AND er.report_date <= ?`;
                params.push(dateTo);
            }
            sql += ` ORDER BY er.report_date DESC LIMIT ?`;
            params.push(limit);

            const rows = db.prepare(sql).all(...params);
            return { success: true, reports: rows };
        } catch (err) {
            console.error('[eod:list-reports] Error:', err.message);
            return { success: false, error: err.message, reports: [] };
        }
    });

    // ---------------------------------------------------------
    // SHIFT HANDOVER FORMS
    // ---------------------------------------------------------
    ipcMain.handle('eod:get-handover', async (event, { handover_id }) => {
        try {
            const handover = db.prepare(`
                SELECT sh.*, 
                       uo.display_name as outgoing_user_name,
                       ui.display_name as incoming_user_name
                FROM shift_handovers sh
                LEFT JOIN users uo ON sh.outgoing_user = uo.id
                LEFT JOIN users ui ON sh.incoming_user = ui.id
                WHERE sh.id = ?
            `).get(handover_id);

            if (!handover) {
                return { success: false, error: 'Handover not found' };
            }

            return { success: true, handover };
        } catch (err) {
            console.error('[eod:get-handover] Error:', err.message);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('eod:list-handovers', async (event, { limit = 50 } = {}) => {
        try {
            const handovers = db.prepare(`
                SELECT sh.*, 
                       uo.display_name as outgoing_user_name,
                       ui.display_name as incoming_user_name
                FROM shift_handovers sh
                LEFT JOIN users uo ON sh.outgoing_user = uo.id
                LEFT JOIN users ui ON sh.incoming_user = ui.id
                ORDER BY sh.handover_at DESC LIMIT ?
            `).all(limit);

            return { success: true, handovers };
        } catch (err) {
            console.error('[eod:list-handovers] Error:', err.message);
            return { success: false, error: err.message, handovers: [] };
        }
    });

    ipcMain.handle('eod:sign-handover', async (event, { handover_id, signature, is_incoming = false }) => {
        try {
            const handover = db.prepare('SELECT * FROM shift_handovers WHERE id = ?').get(handover_id);
            if (!handover) {
                return { success: false, error: 'Handover not found' };
            }

            const field = is_incoming ? 'incoming_signature' : 'outgoing_signature';
            db.prepare(`UPDATE shift_handovers SET ${field} = ? WHERE id = ?`).run(signature, handover_id);

            const updated = db.prepare('SELECT * FROM shift_handovers WHERE id = ?').get(handover_id);
            return { success: true, handover: updated };
        } catch (err) {
            console.error('[eod:sign-handover] Error:', err.message);
            return { success: false, error: err.message };
        }
    });
}

module.exports = { registerEODIPC };