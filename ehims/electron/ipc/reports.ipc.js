const { ipcMain, BrowserWindow, dialog } = require('electron');

function registerReportsIPC(db) {
  ipcMain.handle('reports:save-pdf', async (event, { title, columns = [], rows = [] } = {}) => {
    let printWindow;
    try {
      const saveResult = await dialog.showSaveDialog({
        title: 'Save Report as PDF',
        defaultPath: `${String(title || 'report').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });
      if (saveResult.canceled || !saveResult.filePath) return { success: false, cancelled: true };

      printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
      const company = db.prepare('SELECT * FROM company_settings LIMIT 1').get() || {};
      await printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(buildReportHtml(title, columns, rows, company))}`);
      const pdf = await printWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
      require('fs').writeFileSync(saveResult.filePath, pdf);
      return { success: true, path: saveResult.filePath, message: 'Report PDF saved.' };
    } catch (err) {
      console.error('[reports:save-pdf] Error:', err.message);
      return { success: false, error: `Could not save PDF: ${err.message}` };
    } finally {
      if (printWindow && !printWindow.isDestroyed()) printWindow.close();
    }
  });

  ipcMain.handle('reports:print', async (event, { title, columns = [], rows = [] } = {}) => {
    let printWindow;

    try {
      const settings = db.prepare('SELECT default_printer FROM printer_settings LIMIT 1').get();
      const printerName = settings?.default_printer;

      if (!printerName) {
        return { success: false, error: 'No default printer configured.' };
      }

      const printers = await event.sender.getPrintersAsync();
      if (!printers.some((printer) => printer.name === printerName)) {
        return { success: false, error: `Printer "${printerName}" is not available.` };
      }

      const company = db.prepare('SELECT * FROM company_settings LIMIT 1').get() || {};
      const html = buildReportHtml(title, columns, rows, company);

      printWindow = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });
      await printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

      const result = await new Promise((resolve) => {
        printWindow.webContents.print(
          { silent: true, deviceName: printerName, margins: { marginType: 'default' } },
          (success, failureReason) => resolve({ success, failureReason })
        );
      });

      if (!result.success) {
        return { success: false, error: result.failureReason || 'Report print failed.' };
      }

      return { success: true, message: 'Report sent to printer.' };
    } catch (err) {
      console.error('[reports:print] Error:', err.message);
      return { success: false, error: `Report print failed: ${err.message}` };
    } finally {
      if (printWindow && !printWindow.isDestroyed()) {
        printWindow.close();
      }
    }
  });

  // ---------------------------------------------------------
  // DASHBOARD SUMMARY
  // ---------------------------------------------------------
  ipcMain.handle('reports:dashboard-summary', async () => {
  try {
    const todaySales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
      FROM orders
      WHERE DATE(created_at) = DATE('now','localtime') AND status != 'voided'
    `).get();

    const weekSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE DATE(created_at) >= DATE('now','localtime','-6 days') AND status != 'voided'
    `).get();

    const monthSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE DATE(created_at) >= DATE('now','localtime','-29 days') AND status != 'voided'
    `).get();

    const lowStock = db.prepare(`
      SELECT COUNT(*) as count
      FROM inventory_items
      WHERE current_stock <= low_stock_threshold AND is_active = 1
    `).get();

    const pendingPayments = db.prepare(`
      SELECT COUNT(*) as count
      FROM suppliers
      WHERE credit_balance > 0 AND is_active = 1
    `).get();

    const topItems = db.prepare(`
      SELECT m.name, SUM(oi.quantity) as quantity, SUM(oi.total_price) as sales
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE DATE(oi.created_at) = DATE('now','localtime')
        AND oi.order_id IN (SELECT id FROM orders WHERE status != 'voided')
      GROUP BY oi.menu_item_id
      ORDER BY quantity DESC
      LIMIT 5
    `).all();

    const topStaff = db.prepare(`
      SELECT u.display_name as name, COUNT(o.id) as orders, SUM(o.total_amount) as sales
      FROM orders o
      JOIN users u ON o.cashier_id = u.id
      WHERE DATE(o.created_at) = DATE('now','localtime') AND o.status != 'voided'
      GROUP BY o.cashier_id
      ORDER BY orders DESC
      LIMIT 5
    `).all();

    return {
      success: true,
      data: {
        today_sales: todaySales.total,
        today_orders: todaySales.count,
        this_week_sales: weekSales.total,
        this_month_sales: monthSales.total,
        low_stock_items: lowStock.count,
        pending_supplier_payments: pendingPayments.count,
        top_selling_items: topItems,
        top_staff: topStaff
      }
    };
  } catch (err) {
    console.error('[reports:dashboard-summary] Error:', err.message);
    return { success: false, error: err.message };
  }
});

  // ipcMain.handle('reports:dashboard-summary', async (event) => {
  //   try {
  //     const today = new Date().toISOString().slice(0, 10);
  //     const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  //     const monthStart = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  //     const todaySales = db.prepare(`
  //       SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
  //       FROM orders WHERE DATE(created_at) = ? AND status != 'voided'
  //     `).get(today);

  //     const weekSales = db.prepare(`
  //       SELECT COALESCE(SUM(total_amount), 0) as total
  //       FROM orders WHERE DATE(created_at) >= ? AND status != 'voided'
  //     `).get(weekStart);

  //     const monthSales = db.prepare(`
  //       SELECT COALESCE(SUM(total_amount), 0) as total
  //       FROM orders WHERE DATE(created_at) >= ? AND status != 'voided'
  //     `).get(monthStart);

  //     const lowStock = db.prepare(`
  //       SELECT COUNT(*) as count FROM inventory_items
  //       WHERE current_stock <= low_stock_threshold AND is_active = 1
  //     `).get();

  //     const pendingPayments = db.prepare(`
  //       SELECT COUNT(*) as count FROM suppliers
  //       WHERE credit_balance > 0 AND is_active = 1
  //     `).get();

  //     const topItems = db.prepare(`
  //       SELECT i.name, SUM(oi.quantity) as quantity, SUM(oi.line_total) as sales
  //       FROM order_items oi
  //       JOIN inventory_items i ON oi.item_id = i.id
  //       WHERE DATE(oi.created_at) = ? AND oi.order_id IN (SELECT id FROM orders WHERE status != 'voided')
  //       GROUP BY oi.item_id
  //       ORDER BY quantity DESC
  //       LIMIT 5
  //     `).all(today);

  //     const topStaff = db.prepare(`
  //       SELECT u.display_name as name, COUNT(o.id) as orders, COALESCE(SUM(o.total_amount), 0) as sales
  //       FROM orders o
  //       LEFT JOIN users u ON o.created_by = u.id
  //       WHERE DATE(o.created_at) = ? AND o.status != 'voided'
  //       GROUP BY o.created_by
  //       ORDER BY orders DESC
  //       LIMIT 5
  //     `).all(today);

  //     return {
  //       success: true,
  //       data: {
  //         today_sales: todaySales.total || 0,
  //         today_orders: todaySales.count || 0,
  //         this_week_sales: weekSales.total || 0,
  //         this_month_sales: monthSales.total || 0,
  //         low_stock_items: lowStock.count || 0,
  //         pending_supplier_payments: pendingPayments.count || 0,
  //         top_selling_items: topItems,
  //         top_staff: topStaff
  //       }
  //     };
  //   } catch (err) {
  //     console.error('[reports:dashboard-summary] Error:', err.message);
  //     return { success: false, error: err.message };
  //   }
  // });

  // ---------------------------------------------------------
  // SALES METRICS
  // ---------------------------------------------------------
  ipcMain.handle('reports:sales-metrics', async (event, { date_from, date_to } = {}) => {
    try {
      let sql = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_sales,
          COALESCE(SUM(discount_amount), 0) as total_discounts,
          COALESCE(SUM(CASE WHEN status = 'voided' THEN total_amount ELSE 0 END), 0) as total_voids,
          COALESCE(SUM(total_amount), 0) - COALESCE(SUM(discount_amount), 0) as net_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status != 'voided' THEN total_amount ELSE 0 END), 0) as cash_collected,
          COALESCE(SUM(CASE WHEN payment_method = 'card' AND status != 'voided' THEN total_amount ELSE 0 END), 0) as card_collected,
          COALESCE(SUM(CASE WHEN payment_method = 'transfer' AND status != 'voided' THEN total_amount ELSE 0 END), 0) as transfer_collected
        FROM orders
        WHERE 1=1
      `;
      const params = [];

      if (date_from) {
        sql += ` AND DATE(created_at) >= ?`;
        params.push(date_from);
      }

      if (date_to) {
        sql += ` AND DATE(created_at) <= ?`;
        params.push(date_to);
      }

      sql += ` GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 100`;

      const rows = db.prepare(sql).all(...params);

      return { success: true, data: rows };
    } catch (err) {
      console.error('[reports:sales-metrics] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // SALES TRENDS
  // ---------------------------------------------------------
  ipcMain.handle('reports:sales-trends', async (event, { period = 'daily', limit = 30, date_from, date_to } = {}) => {
    try {
      let datePart = 'DATE(created_at)';

      if (period === 'weekly') {
        datePart = `DATE(created_at, 'start of week')`;
      } else if (period === 'monthly') {
        datePart = `DATE(created_at, 'start of month')`;
      }

      let sql = `
        SELECT 
          ${datePart} as period,
          COALESCE(SUM(total_amount), 0) as sales,
          COUNT(*) as orders,
          ROUND(
            COALESCE(SUM(total_amount), 0) / NULLIF(COUNT(*), 0),
            2
          ) as average_order_value
        FROM orders
        WHERE status != 'voided'
      `;
      const params = [];
      if (date_from) {
        sql += ` AND DATE(created_at) >= ?`;
        params.push(date_from);
      }
      if (date_to) {
        sql += ` AND DATE(created_at) <= ?`;
        params.push(date_to);
      }
      sql += ` GROUP BY ${datePart} ORDER BY period DESC LIMIT ?`;
      params.push(limit);

      const rows = db.prepare(sql).all(...params);

      const withGrowth = rows.map((row, idx) => {
        if (idx < rows.length - 1) {
          const prevSales = rows[idx + 1].sales;
          const growth = prevSales > 0
            ? ((row.sales - prevSales) / prevSales * 100)
            : 0;

          return {
            ...row,
            growth_percent: Math.round(growth)
          };
        }

        return {
          ...row,
          growth_percent: 0
        };
      });

      return { success: true, data: withGrowth };
    } catch (err) {
      console.error('[reports:sales-trends] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // SALES ITEMS
  // ---------------------------------------------------------
  ipcMain.handle('reports:sales-items', async (event, { date_from, date_to } = {}) => {
    try {
      let sql = `
        SELECT
          DATE(o.created_at) as date,
          m.name as item_name,
          SUM(oi.quantity) as quantity,
          COALESCE(SUM(oi.total_price), 0) as sales
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE o.status != 'voided'
      `;
      const params = [];
      if (date_from) {
        sql += ` AND DATE(o.created_at) >= ?`;
        params.push(date_from);
      }
      if (date_to) {
        sql += ` AND DATE(o.created_at) <= ?`;
        params.push(date_to);
      }
      sql += ` GROUP BY DATE(o.created_at), oi.menu_item_id ORDER BY date DESC, item_name ASC`;
      return { success: true, data: db.prepare(sql).all(...params) };
    } catch (err) {
      console.error('[reports:sales-items] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // INVENTORY MOVEMENT
  // ---------------------------------------------------------
  ipcMain.handle('reports:inventory-movement', async (event, payload = {}) => {
  try {
    const date_from = payload.date_from ?? payload.dateFrom;
    const date_to = payload.date_to ?? payload.dateTo;
    const sql = `
      SELECT 
        i.id as item_id,
        i.name as item_name,
        c.name as category,
        i.current_stock as closing_stock,
        COALESCE((
          SELECT SUM(pe.quantity)
          FROM purchase_entries pe
          WHERE pe.item_id = i.id
            AND DATE(pe.purchase_date) >= ?
            ${date_to ? `AND DATE(pe.purchase_date) <= ?` : ''}
        ), 0) as purchases,
        COALESCE((
          SELECT SUM(sii.quantity)
          FROM stock_issuance_items sii
          JOIN stock_issuances si ON si.id = sii.issuance_id
          WHERE sii.item_id = i.id
            AND DATE(si.issued_at) >= ?
            ${date_to ? `AND DATE(si.issued_at) <= ?` : ''}
        ), 0) as issued,
        i.cost_price * i.current_stock as valuation
      FROM inventory_items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.is_active = 1
      ORDER BY i.name
    `;

    const params = date_to
      ? [date_from || '2020-01-01', date_to, date_from || '2020-01-01', date_to]
      : [date_from || '2020-01-01', date_from || '2020-01-01'];

    const rows = db.prepare(sql).all(...params);

    const withOpening = rows.map(row => ({
      ...row,
      opening_stock: row.closing_stock + row.issued - row.purchases
    }));

    return { success: true, data: withOpening };
  } catch (err) {
    console.error('[reports:inventory-movement] Error:', err.message);
    return { success: false, error: err.message, data: [] };
  }
});

  // ipcMain.handle('reports:inventory-movement', async (event, { date_from, date_to } = {}) => {
  //   try {
  //     const sql = `
  //       SELECT 
  //         i.id as item_id,
  //         i.name as item_name,
  //         c.name as category,

  //         COALESCE(
  //           (
  //             SELECT current_stock
  //             FROM inventory_items
  //             WHERE id = i.id
  //           ),
  //           0
  //         ) as closing_stock,

  //         COALESCE(
  //           (
  //             SELECT SUM(quantity)
  //             FROM purchase_entry_items
  //             WHERE item_id = i.id
  //               AND DATE(created_at) >= ?
  //               ${date_to ? `AND DATE(created_at) <= ?` : ''}
  //           ),
  //           0
  //         ) as purchases,

  //         COALESCE(
  //           (
  //             SELECT SUM(quantity)
  //             FROM stock_issuance_items
  //             WHERE item_id = i.id
  //               AND DATE(created_at) >= ?
  //               ${date_to ? `AND DATE(created_at) <= ?` : ''}
  //           ),
  //           0
  //         ) as issued,

  //         i.cost_per_unit *
  //         COALESCE(
  //           (
  //             SELECT current_stock
  //             FROM inventory_items
  //             WHERE id = i.id
  //           ),
  //           0
  //         ) as valuation

  //       FROM inventory_items i
  //       LEFT JOIN categories c ON i.category_id = c.id
  //       WHERE i.is_active = 1
  //       ORDER BY i.name
  //     `;

  //     const params = date_to
  //       ? [date_from || '2020-01-01', date_to, date_from || '2020-01-01', date_to]
  //       : [date_from || '2020-01-01', date_from || '2020-01-01'];

  //     const rows = db.prepare(sql).all(...params);

  //     const withOpening = rows.map(row => ({
  //       ...row,
  //       opening_stock: row.closing_stock + row.issued - row.purchases
  //     }));

  //     return { success: true, data: withOpening };
  //   } catch (err) {
  //     console.error('[reports:inventory-movement] Error:', err.message);
  //     return { success: false, error: err.message, data: [] };
  //   }
  // });

  // ---------------------------------------------------------
  // INVENTORY ALERTS
  // ---------------------------------------------------------
  ipcMain.handle('reports:inventory-alerts', async (event) => {
    try {
      const alerts = db.prepare(`
        SELECT 
          id as item_id,
          name as item_name,
          current_stock,
          low_stock_threshold,
          CASE 
            WHEN current_stock = 0 THEN 'critical'
            WHEN current_stock <= low_stock_threshold THEN 'warning'
            ELSE 'ok'
          END as status
        FROM inventory_items
        WHERE is_active = 1
          AND current_stock <= low_stock_threshold
        ORDER BY current_stock ASC
      `).all();

      return { success: true, data: alerts };
    } catch (err) {
      console.error('[reports:inventory-alerts] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // INVENTORY VALUATION
  // ---------------------------------------------------------
  ipcMain.handle('reports:inventory-valuation', async (event) => {
    try {
      const items = db.prepare(`
        SELECT 
          id as item_id,
          name as item_name,
          category_id,
          current_stock,
          cost_price,
          current_stock * cost_price as valuation
        FROM inventory_items
        WHERE is_active = 1
          AND current_stock > 0
        ORDER BY valuation DESC
      `).all();

      const totalValuation = items.reduce(
        (sum, item) => sum + (item.valuation || 0),
        0
      );

      return {
        success: true,
        data: {
          total_valuation: totalValuation,
          items
        }
      };
    } catch (err) {
      console.error('[reports:inventory-valuation] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // SUPPLIER METRICS
  // ---------------------------------------------------------
  ipcMain.handle('reports:supplier-metrics', async (event) => {
    try {
      const suppliers = db.prepare(`
        SELECT 
          s.id as supplier_id,
          s.name as supplier_name,
          COALESCE(SUM(DISTINCT pe.total_cost), 0) as total_purchases,
          COALESCE(SUM(sp.amount), 0) as total_payments,
          s.credit_balance,
          100 as on_time_rate,
          30 as average_delivery_days
        FROM suppliers s
        LEFT JOIN purchase_entries pe ON s.id = pe.supplier_id
        LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id
        WHERE s.is_active = 1
        GROUP BY s.id
        ORDER BY total_purchases DESC
      `).all();

      return { success: true, data: suppliers };
    } catch (err) {
      console.error('[reports:supplier-metrics] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // STAFF METRICS
  // ---------------------------------------------------------
  ipcMain.handle('reports:staff-metrics', async (event, { date_from, date_to } = {}) => {
  try {
    let sql = `
      SELECT 
        o.cashier_id as user_id,
        u.display_name as user_name,
        u.role,
        COUNT(DISTINCT o.id) as orders_created,
        SUM(CASE WHEN o.status != 'voided' THEN o.total_amount ELSE 0 END) as total_sales,
        ROUND(
          SUM(CASE WHEN o.status != 'voided' THEN o.total_amount ELSE 0 END) /
          NULLIF(COUNT(DISTINCT CASE WHEN o.status != 'voided' THEN o.id END), 0),
          2
        ) as average_order_value,
        SUM(o.discount_amount) as discounts_applied,
        SUM(CASE WHEN o.status = 'voided' THEN 1 ELSE 0 END) as orders_voided
      FROM orders o
      LEFT JOIN users u ON o.cashier_id = u.id
      WHERE 1=1
    `;

    const params = [];
    if (date_from) {
      sql += ` AND DATE(o.created_at) >= ?`;
      params.push(date_from);
    }
    if (date_to) {
      sql += ` AND DATE(o.created_at) <= ?`;
      params.push(date_to);
    }

    sql += ` GROUP BY o.cashier_id ORDER BY total_sales DESC`;

    const rows = db.prepare(sql).all(...params);

    return { success: true, data: rows };
  } catch (err) {
    console.error('[reports:staff-metrics] Error:', err.message);
    return { success: false, error: err.message, data: [] };
  }
});

  // ipcMain.handle('reports:staff-metrics', async (event, { date_from, date_to } = {}) => {
  //   try {
  //     let sql = `
  //       SELECT 
  //         o.created_by as user_id,
  //         u.display_name as user_name,
  //         u.role,
  //         COUNT(DISTINCT o.id) as orders_created,
  //         COALESCE(
  //           SUM(
  //             CASE
  //               WHEN o.status != 'voided'
  //               THEN o.total_amount
  //               ELSE 0
  //             END
  //           ),
  //           0
  //         ) as total_sales,
  //         ROUND(
  //           COALESCE(
  //             SUM(
  //               CASE
  //                 WHEN o.status != 'voided'
  //                 THEN o.total_amount
  //                 ELSE 0
  //               END
  //             ),
  //             0
  //           ) /
  //           NULLIF(
  //             COUNT(
  //               DISTINCT CASE
  //                 WHEN o.status != 'voided'
  //                 THEN o.id
  //               END
  //             ),
  //             0
  //           ),
  //           2
  //         ) as average_order_value,
  //         COALESCE(SUM(o.discount_amount), 0) as discounts_applied,
  //         SUM(
  //           CASE
  //             WHEN o.status = 'voided'
  //             THEN 1
  //             ELSE 0
  //           END
  //         ) as orders_voided
  //       FROM orders o
  //       LEFT JOIN users u ON o.created_by = u.id
  //       WHERE 1=1
  //     `;

  //     const params = [];

  //     if (date_from) {
  //       sql += ` AND DATE(o.created_at) >= ?`;
  //       params.push(date_from);
  //     }

  //     if (date_to) {
  //       sql += ` AND DATE(o.created_at) <= ?`;
  //       params.push(date_to);
  //     }

  //     sql += ` GROUP BY o.created_by ORDER BY total_sales DESC`;

  //     const rows = db.prepare(sql).all(...params);

  //     return { success: true, data: rows };
  //   } catch (err) {
  //     console.error('[reports:staff-metrics] Error:', err.message);
  //     return { success: false, error: err.message, data: [] };
  //   }
  // });

  // // ---------------------------------------------------------
  // // PROFIT & LOSS
  // ---------------------------------------------------------
  ipcMain.handle('reports:profit-loss', async (event, { date_from, date_to } = {}) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const from = date_from || today;
    const to = date_to || today;

    // Revenue = sum of order totals
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
        AND status != 'voided'
    `).get(from, to);

    // COGS = sum of stock issuance costs
    const cogs = db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total
      FROM stock_issuance_items sii
      JOIN stock_issuances si ON sii.issuance_id = si.id
      WHERE DATE(si.issued_at) >= ?
        AND DATE(si.issued_at) <= ?
    `).get(from, to);

    // Discounts
    const discounts = db.prepare(`
      SELECT COALESCE(SUM(discount_amount), 0) as total
      FROM orders
      WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
        AND status != 'voided'
    `).get(from, to);

    const totalRevenue = revenue.total || 0;
    const totalCogs = cogs.total || 0;
    const totalDiscounts = discounts.total || 0;

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalDiscounts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;

    return {
      success: true,
      data: {
        period: `${from} to ${to}`,
        total_revenue: totalRevenue,
        total_cogs: totalCogs,
        gross_profit: grossProfit,
        total_discounts: totalDiscounts,
        net_profit: netProfit,
        profit_margin: Math.round(profitMargin)
      }
    };
  } catch (err) {
    console.error('[reports:profit-loss] Error:', err.message);
    return { success: false, error: err.message };
  }
});

  // ipcMain.handle('reports:profit-loss', async (event, { date_from, date_to } = {}) => {
  //   try {
  //     const today = new Date().toISOString().slice(0, 10);
  //     const from = date_from || today;
  //     const to = date_to || today;

  //     const revenue = db.prepare(`
  //       SELECT COALESCE(SUM(total_amount), 0) as total
  //       FROM orders
  //       WHERE DATE(created_at) >= ?
  //         AND DATE(created_at) <= ?
  //         AND status != 'voided'
  //     `).get(from, to);

  //     const cogs = db.prepare(`
  //       SELECT COALESCE(SUM(sii.total_cost), 0) as total
  //       FROM stock_issuance_items sii
  //       JOIN stock_issuances si ON sii.issuance_id = si.id
  //       WHERE DATE(si.created_at) >= ?
  //         AND DATE(si.created_at) <= ?
  //     `).get(from, to);

  //     const discounts = db.prepare(`
  //       SELECT COALESCE(SUM(discount_amount), 0) as total
  //       FROM orders
  //       WHERE DATE(created_at) >= ?
  //         AND DATE(created_at) <= ?
  //         AND status != 'voided'
  //     `).get(from, to);

  //     const totalRevenue = revenue.total || 0;
  //     const totalCogs = cogs.total || 0;
  //     const totalDiscounts = discounts.total || 0;

  //     const grossProfit = totalRevenue - totalCogs;
  //     const netProfit = grossProfit - totalDiscounts;

  //     const profitMargin = totalRevenue > 0
  //       ? (netProfit / totalRevenue * 100)
  //       : 0;

  //     return {
  //       success: true,
  //       data: {
  //         period: `${from} to ${to}`,
  //         total_revenue: totalRevenue,
  //         total_cogs: totalCogs,
  //         gross_profit: grossProfit,
  //         total_discounts: totalDiscounts,
  //         net_profit: netProfit,
  //         profit_margin: Math.round(profitMargin)
  //       }
  //     };
  //   } catch (err) {
  //     console.error('[reports:profit-loss] Error:', err.message);
  //     return { success: false, error: err.message };
  //   }
  // });

  // ---------------------------------------------------------
  // PURCHASE REPORT
  // ---------------------------------------------------------
  ipcMain.handle('reports:purchase-report', async (event, payload = {}) => {
    try {
      const status = payload.status || 'all';
      const date_from = payload.date_from ?? payload.dateFrom;
      const date_to = payload.date_to ?? payload.dateTo;
      let sql = `
        SELECT 
          pe.id,
          pe.purchase_date,
          s.name as supplier_name,
          s.account_number,
          pe.total_cost,

          COALESCE(
            (
              SELECT SUM(sp.amount)
              FROM supplier_payments sp
              WHERE sp.supplier_id = pe.supplier_id
            ),
            0
          ) as total_paid,

          pe.total_cost -
          COALESCE(
            (
              SELECT SUM(sp.amount)
              FROM supplier_payments sp
              WHERE sp.supplier_id = pe.supplier_id
            ),
            0
          ) as outstanding,

          CASE
            WHEN pe.total_cost -
              COALESCE(
                (
                  SELECT SUM(sp.amount)
                  FROM supplier_payments sp
                  WHERE sp.supplier_id = pe.supplier_id
                ),
                0
              ) <= 0
            THEN 'paid'
            ELSE 'credit'
          END as credit_status

        FROM purchase_entries pe
        JOIN suppliers s ON pe.supplier_id = s.id
        WHERE 1=1
      `;

      const params = [];

      if (date_from) {
        sql += ` AND DATE(pe.purchase_date) >= ?`;
        params.push(date_from);
      }

      if (date_to) {
        sql += ` AND DATE(pe.purchase_date) <= ?`;
        params.push(date_to);
      }

      if (status === 'credit') {
        sql += `
          AND (
            pe.total_cost -
            COALESCE(
              (
                SELECT SUM(sp.amount)
                FROM supplier_payments sp
                WHERE sp.supplier_id = pe.supplier_id
              ),
              0
            )
          ) > 0
        `;
      } else if (status === 'paid') {
        sql += `
          AND (
            pe.total_cost -
            COALESCE(
              (
                SELECT SUM(sp.amount)
                FROM supplier_payments sp
                WHERE sp.supplier_id = pe.supplier_id
              ),
              0
            )
          ) <= 0
        `;
      }

      sql += ` ORDER BY pe.purchase_date DESC`;

      const rows = db.prepare(sql).all(...params);

      return { success: true, data: rows };
    } catch (err) {
      console.error('[reports:purchase-report] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // STOCK ISSUANCE REPORT
  // ---------------------------------------------------------
  ipcMain.handle('reports:stock-issuance-report', async (event, payload = {}) => {
    try {
      const shift_id = payload.shift_id ?? payload.shiftId;
      const date_from = payload.date_from ?? payload.dateFrom;
      const date_to = payload.date_to ?? payload.dateTo;
      let sql = `
        SELECT 
          si.id,
          COALESCE(si.created_at, si.issued_at) as created_at,
          s.shift_name,
          u.display_name as issued_by,
          GROUP_CONCAT(
            i.name || ' (Qty: ' || sii.quantity || ')',
            ', '
          ) as items,
          COUNT(DISTINCT sii.id) as item_count,
          SUM(sii.total_cost) as total_cost
        FROM stock_issuances si
        LEFT JOIN shifts s ON si.shift_id = s.id
        LEFT JOIN users u ON si.issued_by = u.id
        LEFT JOIN stock_issuance_items sii ON si.id = sii.issuance_id
        LEFT JOIN inventory_items i ON sii.item_id = i.id
        WHERE 1=1
      `;

      const params = [];

      if (shift_id) {
        sql += ` AND si.shift_id = ?`;
        params.push(shift_id);
      }

      if (date_from) {
        sql += ` AND DATE(COALESCE(si.created_at, si.issued_at)) >= ?`;
        params.push(date_from);
      }

      if (date_to) {
        sql += ` AND DATE(COALESCE(si.created_at, si.issued_at)) <= ?`;
        params.push(date_to);
      }

      sql += ` GROUP BY si.id ORDER BY COALESCE(si.created_at, si.issued_at) DESC`;

      const rows = db.prepare(sql).all(...params);

      return { success: true, data: rows };
    } catch (err) {
      console.error('[reports:stock-issuance-report] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });
}

function buildReportHtml(title, columns, rows, company = {}) {
  const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join('')}</tr>`).join('');
  const logo = company.company_logo
    ? `<img src="data:image/png;base64,${Buffer.from(company.company_logo).toString('base64')}" alt="Company logo">`
    : '';
  const companyDetails = [
    company.address,
    company.phone,
    company.email,
    company.website,
    company.registration_number ? `Reg: ${company.registration_number}` : '',
    company.tax_id ? `Tax ID: ${company.tax_id}` : ''
  ].filter(Boolean).map(escapeHtml).join(' | ');
  const reportDate = new Date().toLocaleDateString();
  const generatedAt = new Date().toLocaleString();

  return `<!doctype html><html><head><meta charset="UTF-8"><title>${escapeHtml(title || 'Report')}</title><style>
    @page { margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111; }
    .company-header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
    .company-header img { width: 58px; max-height: 58px; object-fit: contain; }
    .company-name { font-size: 20px; font-weight: bold; margin: 0 0 5px; }
    .company-details { font-size: 10px; margin: 0; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .metadata { font-size: 10px; margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
    th, td { border: 1px solid #bbb; padding: 5px; text-align: left; }
    th { background: #eee; }
  </style></head><body>
    <header class="company-header">${logo}<div><p class="company-name">${escapeHtml(company.company_name || 'Your Company')}</p><p class="company-details">${companyDetails}</p></div></header>
    <h1>${escapeHtml(title || 'Report')}</h1>
    <p class="metadata"><strong>Report date:</strong> ${escapeHtml(reportDate)}</p>
    <p class="metadata"><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
    <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { registerReportsIPC };
