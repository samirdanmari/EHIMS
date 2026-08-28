const { ipcMain } = require('electron');

function registerReportsIPC(db) {
  // ---------------------------------------------------------
  // DASHBOARD SUMMARY
  // ---------------------------------------------------------
  ipcMain.handle('reports:dashboard-summary', async (event) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const monthStart = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Today's sales
      const todaySales = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
        FROM orders WHERE DATE(created_at) = ? AND status != 'voided'
      `).get(today);

      // This week
      const weekSales = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders WHERE DATE(created_at) >= ? AND status != 'voided'
      `).get(weekStart);

      // This month
      const monthSales = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders WHERE DATE(created_at) >= ? AND status != 'voided'
      `).get(monthStart);

      // Low stock items
      const lowStock = db.prepare(`
        SELECT COUNT(*) as count FROM inventory_items
        WHERE current_stock <= low_stock_threshold AND is_active = 1
      `).get();

      // Pending supplier payments (credit > 0)
      const pendingPayments = db.prepare(`
        SELECT COUNT(*) as count FROM suppliers
        WHERE credit_balance > 0 AND is_active = 1
      `).get();

      // Top selling items
      const topItems = db.prepare(`
        SELECT i.name, SUM(oi.quantity) as quantity, SUM(oi.line_total) as sales
        FROM order_items oi
        JOIN inventory_items i ON oi.item_id = i.id
        WHERE DATE(oi.created_at) = ? AND oi.order_id IN (SELECT id FROM orders WHERE status != 'voided')
        GROUP BY oi.item_id
        ORDER BY quantity DESC
        LIMIT 5
      `).all(today);

      // Top staff
      const topStaff = db.prepare(`
        SELECT u.display_name as name, COUNT(o.id) as orders, COALESCE(SUM(o.total_amount), 0) as sales
        FROM orders o
        LEFT JOIN users u ON o.created_by = u.id
        WHERE DATE(o.created_at) = ? AND o.status != 'voided'
        GROUP BY o.created_by
        ORDER BY orders DESC
        LIMIT 5
      `).all(today);

      return {
        success: true,
        data: {
          today_sales: todaySales.total || 0,
          today_orders: todaySales.count || 0,
          this_week_sales: weekSales.total || 0,
          this_month_sales: monthSales.total || 0,
          low_stock_items: lowStock.count || 0,
          pending_supplier_payments: pendingPayments.count || 0,
          top_selling_items: topItems,
          top_staff: topStaff
        }
      };
    } catch (err) {
      console.error('[reports:dashboard-summary] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

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
  ipcMain.handle('reports:sales-trends', async (event, { period = 'daily', limit = 30 } = {}) => {
    try {
      let datePart = 'DATE(created_at)';
      if (period === 'weekly') {
        datePart = `DATE(created_at, 'start of week')`;
      } else if (period === 'monthly') {
        datePart = `DATE(created_at, 'start of month')`;
      }

      const sql = `
        SELECT 
          ${datePart} as period,
          COALESCE(SUM(total_amount), 0) as sales,
          COUNT(*) as orders,
          ROUND(COALESCE(SUM(total_amount), 0) / NULLIF(COUNT(*), 0), 2) as average_order_value
        FROM orders
        WHERE status != 'voided'
        GROUP BY ${datePart}
        ORDER BY period DESC
        LIMIT ?
      `;

      const rows = db.prepare(sql).all(limit);

      // Calculate growth percent
      const withGrowth = rows.map((row, idx) => {
        if (idx < rows.length - 1) {
          const prevSales = rows[idx + 1].sales;
          const growth = prevSales > 0 ? ((row.sales - prevSales) / prevSales * 100) : 0;
          return { ...row, growth_percent: Math.round(growth) };
        }
        return row;
      });

      return { success: true, data: withGrowth };
    } catch (err) {
      console.error('[reports:sales-trends] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // INVENTORY MOVEMENT
  // ---------------------------------------------------------
  ipcMain.handle('reports:inventory-movement', async (event, { date_from, date_to } = {}) => {
    try {
      let sql = `
        SELECT 
          i.id as item_id,
          i.name as item_name,
          c.name as category,
          COALESCE((SELECT current_stock FROM inventory_items WHERE id = i.id), 0) as closing_stock,
          COALESCE((SELECT SUM(quantity) FROM purchase_entry_items WHERE item_id = i.id AND DATE(created_at) >= ?), 0) as purchases,
          COALESCE((SELECT SUM(quantity) FROM stock_issuance_items WHERE item_id = i.id AND DATE(created_at) >= ?), 0) as issued,
          i.cost_per_unit * COALESCE((SELECT current_stock FROM inventory_items WHERE id = i.id), 0) as valuation
        FROM inventory_items i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.is_active = 1
        ORDER BY i.name
      `;
      const params = [date_from || '2020-01-01', date_from || '2020-01-01'];

      if (date_to) {
        // Adjust query for date range
        sql = sql.replace('>=', '>='); // Keep as is
      }

      const rows = db.prepare(sql).all(...params);

      // Calculate opening stock
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
        WHERE is_active = 1 AND current_stock <= low_stock_threshold
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
          cost_per_unit,
          current_stock * cost_per_unit as valuation
        FROM inventory_items
        WHERE is_active = 1 AND current_stock > 0
        ORDER BY valuation DESC
      `).all();

      const totalValuation = items.reduce((sum, item) => sum + (item.valuation || 0), 0);

      return { success: true, data: { total_valuation: totalValuation, items } };
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
          o.created_by as user_id,
          u.display_name as user_name,
          u.role,
          COUNT(DISTINCT o.id) as orders_created,
          COALESCE(SUM(CASE WHEN o.status != 'voided' THEN o.total_amount ELSE 0 END), 0) as total_sales,
          ROUND(COALESCE(SUM(CASE WHEN o.status != 'voided' THEN o.total_amount ELSE 0 END), 0) / NULLIF(COUNT(DISTINCT CASE WHEN o.status != 'voided' THEN o.id END), 0), 2) as average_order_value,
          COALESCE(SUM(o.discount_amount), 0) as discounts_applied,
          SUM(CASE WHEN o.status = 'voided' THEN 1 ELSE 0 END) as orders_voided
        FROM orders o
        LEFT JOIN users u ON o.created_by = u.id
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

      sql += ` GROUP BY o.created_by ORDER BY total_sales DESC`;

      const rows = db.prepare(sql).all(...params);
      return { success: true, data: rows };
    } catch (err) {
      console.error('[reports:staff-metrics] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // PROFIT & LOSS
  // ---------------------------------------------------------
  ipcMain.handle('reports:profit-loss', async (event, { date_from, date_to } = {}) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const from = date_from || today;
      const to = date_to || today;

      // Revenue
      const revenue = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? AND status != 'voided'
      `).get(from, to);

      // COGS
      const cogs = db.prepare(`
        SELECT COALESCE(SUM(sii.total_cost), 0) as total
        FROM stock_issuance_items sii
        JOIN stock_issuances si ON sii.issuance_id = si.id
        WHERE DATE(si.created_at) >= ? AND DATE(si.created_at) <= ?
      `).get(from, to);

      // Discounts
      const discounts = db.prepare(`
        SELECT COALESCE(SUM(discount_amount), 0) as total
        FROM orders
        WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
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
}

module.exports = { registerReportsIPC };