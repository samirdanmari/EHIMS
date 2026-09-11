const { ipcMain } = require('electron');

function registerCustomerIPC(db) {
  // ---------------------------------------------------------
  // CREATE CUSTOMER
  // ---------------------------------------------------------
  ipcMain.handle('customer:create', async (event, { full_name, phone, email, address, notes, credit_limit = 0 }) => {
    try {
      if (!full_name || !full_name.trim()) {
        return { success: false, error: 'Full name is required.' };
      }

      const existing = db.prepare('SELECT id FROM regular_customers WHERE phone = ? AND phone IS NOT NULL').get(phone || null);
      if (existing && phone) {
        return { success: false, error: `A customer with phone "${phone}" already exists.` };
      }

      const result = db.prepare(`
        INSERT INTO regular_customers (full_name, phone, email, address, notes, credit_limit, outstanding_balance, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 0, 1)
      `).run(
        full_name.trim(),
        phone || null,
        email || null,
        address || null,
        notes || null,
        Number(credit_limit) || 0
      );

      const customer = db.prepare('SELECT * FROM regular_customers WHERE id = ?').get(result.lastInsertRowid);
      return { success: true, data: customer };
    } catch (err) {
      console.error('[customer:create] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // LIST CUSTOMERS
  // ---------------------------------------------------------
  ipcMain.handle('customer:list', async (event, { search = '', includeInactive = false } = {}) => {
    try {
      let sql = `
        SELECT
          rc.*,
          (
            SELECT COUNT(*)
            FROM orders customer_orders
            WHERE customer_orders.customer_id = rc.id
              AND customer_orders.status != 'voided'
          ) AS total_orders,
          MAX(
            0,
            COALESCE((
              SELECT SUM(o.total_amount)
              FROM orders o
              WHERE o.customer_id = rc.id
                AND o.is_credit = 1
                AND o.credit_status IN ('unpaid', 'partial')
                AND o.status != 'voided'
            ), 0) - COALESCE((
              SELECT SUM(cp.amount)
              FROM customer_payments cp
              WHERE cp.customer_id = rc.id
                AND (
                  cp.order_id IS NULL
                  OR EXISTS (
                    SELECT 1
                    FROM orders paid_order
                    WHERE paid_order.id = cp.order_id
                      AND paid_order.customer_id = rc.id
                      AND paid_order.is_credit = 1
                      AND paid_order.credit_status IN ('unpaid', 'partial')
                      AND paid_order.status != 'voided'
                  )
                )
            ), 0)
          ) AS computed_outstanding
        FROM regular_customers rc
      `;
      const conditions = [];
      const params = [];

      if (!includeInactive) {
        conditions.push('rc.is_active = 1');
      }
      if (search && search.trim()) {
        conditions.push('(rc.full_name LIKE ? OR rc.phone LIKE ? OR rc.email LIKE ?)');
        const q = `%${search.trim()}%`;
        params.push(q, q, q);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY rc.full_name ASC';

      const customers = db.prepare(sql).all(...params).map((customer) => ({
        ...customer,
        outstanding_balance: Math.max(
          0,
          Number(customer.computed_outstanding || 0),
        ),
      }));
      return { success: true, data: customers };
    } catch (err) {
      console.error('[customer:list] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  // ---------------------------------------------------------
  // GET SINGLE CUSTOMER (with purchase history)
  // ---------------------------------------------------------
  ipcMain.handle('customer:get', async (event, { id }) => {
    try {
      const customer = db.prepare(`
        SELECT
          rc.*,
          MAX(
            0,
            COALESCE((
              SELECT SUM(o.total_amount)
              FROM orders o
              WHERE o.customer_id = rc.id
                AND o.is_credit = 1
                AND o.credit_status IN ('unpaid', 'partial')
                AND o.status != 'voided'
            ), 0) - COALESCE((
              SELECT SUM(cp.amount)
              FROM customer_payments cp
              WHERE cp.customer_id = rc.id
                AND (
                  cp.order_id IS NULL
                  OR EXISTS (
                    SELECT 1
                    FROM orders paid_order
                    WHERE paid_order.id = cp.order_id
                      AND paid_order.customer_id = rc.id
                      AND paid_order.is_credit = 1
                      AND paid_order.credit_status IN ('unpaid', 'partial')
                      AND paid_order.status != 'voided'
                  )
                )
            ), 0)
          ) AS calculated_outstanding
        FROM regular_customers rc
        WHERE rc.id = ?
      `).get(id);
      if (!customer) {
        return { success: false, error: 'Customer not found.' };
      }
      customer.outstanding_balance = Number(customer.calculated_outstanding || 0);
      delete customer.calculated_outstanding;

      const purchases = db.prepare(`
        SELECT
          o.id,
          o.order_number,
          o.total_amount,
          o.payment_method,
          o.is_credit,
          o.credit_status,
          o.created_at,
          o.completed_at,
          o.status,
          u.display_name AS cashier_name,
          COALESCE(
            (SELECT SUM(cp.amount) FROM customer_payments cp WHERE cp.order_id = o.id),
            0
          ) AS amount_paid
        FROM orders o
        LEFT JOIN users u ON u.id = o.cashier_id
        WHERE o.customer_id = ?
        ORDER BY o.created_at DESC
      `).all(id);

      const getItems = db.prepare(`
        SELECT
          oi.id,
          oi.menu_item_id,
          COALESCE(mi.name, 'Unknown item') AS menu_item_name,
          oi.quantity,
          oi.unit_price,
          oi.total_price,
          oi.notes
        FROM order_items oi
        LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `);
      purchases.forEach((purchase) => {
        purchase.items = getItems.all(purchase.id);
      });

      const payments = db.prepare(`
        SELECT
          cp.*,
          u.display_name AS recorded_by_name
        FROM customer_payments cp
        LEFT JOIN users u ON u.id = cp.recorded_by
        WHERE cp.customer_id = ?
        ORDER BY cp.payment_date DESC
      `).all(id);

      return { success: true, data: { customer, purchases, payments } };
    } catch (err) {
      console.error('[customer:get] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // UPDATE CUSTOMER
  // ---------------------------------------------------------
  ipcMain.handle('customer:update', async (event, { id, full_name, phone, email, address, notes, credit_limit }) => {
    try {
      if (!id) return { success: false, error: 'Customer ID is required.' };

      const existing = db.prepare('SELECT * FROM regular_customers WHERE id = ?').get(id);
      if (!existing) return { success: false, error: 'Customer not found.' };

      // Check phone uniqueness (excluding current record)
      if (phone) {
        const duplicate = db.prepare(
          'SELECT id FROM regular_customers WHERE phone = ? AND id != ?'
        ).get(phone, id);
        if (duplicate) {
          return { success: false, error: `Phone "${phone}" is already used by another customer.` };
        }
      }

      db.prepare(`
        UPDATE regular_customers SET
          full_name = COALESCE(?, full_name),
          phone = COALESCE(?, phone),
          email = ?,
          address = ?,
          notes = ?,
          credit_limit = COALESCE(?, credit_limit),
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(
        full_name || null,
        phone || null,
        email !== undefined ? email : existing.email,
        address !== undefined ? address : existing.address,
        notes !== undefined ? notes : existing.notes,
        credit_limit !== undefined ? Number(credit_limit) : null,
        id
      );

      const updated = db.prepare('SELECT * FROM regular_customers WHERE id = ?').get(id);
      return { success: true, data: updated };
    } catch (err) {
      console.error('[customer:update] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // DEACTIVATE CUSTOMER (soft delete)
  // ---------------------------------------------------------
  ipcMain.handle('customer:deactivate', async (event, { id }) => {
    try {
      const existing = db.prepare('SELECT id FROM regular_customers WHERE id = ?').get(id);
      if (!existing) return { success: false, error: 'Customer not found.' };

      db.prepare(`
        UPDATE regular_customers SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?
      `).run(id);

      return { success: true };
    } catch (err) {
      console.error('[customer:deactivate] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // RECORD PAYMENT (against customer outstanding balance)
  // ---------------------------------------------------------
  ipcMain.handle('customer:record-payment', async (event, {
    customer_id, order_id, amount, payment_method, reference, recorded_by, notes
  }) => {
    try {
      if (!customer_id) return { success: false, error: 'Customer ID is required.' };
      if (!amount || amount <= 0) return { success: false, error: 'Payment amount must be positive.' };
      if (!recorded_by) return { success: false, error: 'Recorder user ID is required.' };

      const customer = db.prepare('SELECT * FROM regular_customers WHERE id = ?').get(customer_id);
      if (!customer) return { success: false, error: 'Customer not found.' };

      const recordPayment = db.transaction(() => {
        // Insert payment record
        const payRes = db.prepare(`
          INSERT INTO customer_payments (customer_id, order_id, amount, payment_method, reference, recorded_by, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          customer_id,
          order_id || null,
          Number(amount),
          payment_method || 'cash',
          reference || null,
          recorded_by,
          notes || null
        );

        // Reduce outstanding balance
        db.prepare(`
          UPDATE regular_customers
          SET outstanding_balance = MAX(0, outstanding_balance - ?),
              updated_at = datetime('now','localtime')
          WHERE id = ?
        `).run(Number(amount), customer_id);

        // If order_id provided, mark order credit status
        if (order_id) {
          const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
          if (order) {
            const totalPaid = db.prepare(
              'SELECT COALESCE(SUM(amount), 0) AS total FROM customer_payments WHERE order_id = ?'
            ).get(order_id).total;

            const newStatus = totalPaid >= order.total_amount ? 'paid' : 'partial';
            db.prepare(`UPDATE orders SET credit_status = ? WHERE id = ?`).run(newStatus, order_id);
          }
        }

        return payRes.lastInsertRowid;
      });

      const paymentId = recordPayment();
      const updatedCustomer = db.prepare('SELECT * FROM regular_customers WHERE id = ?').get(customer_id);

      return { success: true, data: { paymentId, customer: updatedCustomer } };
    } catch (err) {
      console.error('[customer:record-payment] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // SEARCH CUSTOMERS (for POS typeahead)
  // ---------------------------------------------------------
  ipcMain.handle('customer:search', async (event, { query = '' }) => {
    try {
      const q = `%${query.trim()}%`;
      const customers = db.prepare(`
        SELECT id, full_name, phone, outstanding_balance, credit_limit
        FROM regular_customers
        WHERE is_active = 1 AND (full_name LIKE ? OR phone LIKE ?)
        ORDER BY full_name ASC
        LIMIT 10
      `).all(q, q);
      return { success: true, data: customers };
    } catch (err) {
      console.error('[customer:search] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });
}

module.exports = { registerCustomerIPC };
