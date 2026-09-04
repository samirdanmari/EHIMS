const { ipcMain } = require('electron');

function registerSuspendedOrdersIPC(db) {
  // ---------------------------------------------------------
  // SUSPEND ORDER
  // ---------------------------------------------------------
  ipcMain.handle('suspended-orders:suspend', async (event, { orderNumber, customerName, tableNumber, items, subtotal, discount, tax, notes, suspendedBy }) => {
    try {
      if (!orderNumber || !items || (Array.isArray(items) && items.length === 0) || (!Array.isArray(items) && !items)) {
        return { success: false, error: 'Order number and items are required' };
      }

      // Handle items - convert to JSON if it's an array
      const itemsJson = Array.isArray(items) ? JSON.stringify(items) : items;
      
      const info = db.prepare(`
        INSERT INTO suspended_orders (order_number, customer_name, table_number, items, subtotal, discount_amount, tax_amount, notes, suspended_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderNumber,
        customerName || null,
        tableNumber || null,
        itemsJson,
        subtotal || 0,
        discount || 0,
        tax || 0,
        notes || null,
        suspendedBy
      );

      return { 
        success: true, 
        message: `Order #${orderNumber} suspended successfully`,
        id: info.lastInsertRowid 
      };
    } catch (err) {
      console.error('[suspended-orders:suspend] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // LIST SUSPENDED ORDERS
  // ---------------------------------------------------------
  ipcMain.handle('suspended-orders:list', async (event) => {
    try {
      const orders = db.prepare(`
        SELECT s.*, u.display_name as suspended_by_name
        FROM suspended_orders s
        LEFT JOIN users u ON s.suspended_by = u.id
        WHERE s.status = 'active'
        ORDER BY s.suspended_at DESC
      `).all();

      // Parse items JSON for each order
      const parsedOrders = orders.map(order => ({
        ...order,
        items: JSON.parse(order.items || '[]')
      }));

      return { success: true, data: parsedOrders };
    } catch (err) {
      console.error('[suspended-orders:list] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // RETRIEVE SUSPENDED ORDER
  // ---------------------------------------------------------
  ipcMain.handle('suspended-orders:retrieve', async (event, { id } = {}) => {
    try {
      const orderId = Number(id);
      if (!Number.isSafeInteger(orderId) || orderId < 1) {
        return { success: false, error: 'A valid suspended order id is required' };
      }

      const order = db.prepare('SELECT * FROM suspended_orders WHERE id = ? AND status = ?').get(orderId, 'active');
      
      if (!order) {
        return { success: false, error: 'Suspended order not found or already retrieved' };
      }

      // Parse before updating status so a malformed payload remains available for recovery.
      const items = JSON.parse(order.items || '[]');
      if (!Array.isArray(items)) {
        return { success: false, error: 'Suspended order items are invalid' };
      }

      // Update status to retrieved
      db.prepare(`
        UPDATE suspended_orders
        SET status = 'retrieved', retrieved_at = datetime('now','localtime')
        WHERE id = ?
      `).run(orderId);

      return {
        success: true,
        data: {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          tableNumber: order.table_number,
          items: items,
          subtotal: order.subtotal,
          discount: order.discount_amount,
          tax: order.tax_amount,
          notes: order.notes
        }
      };
    } catch (err) {
      console.error('[suspended-orders:retrieve] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // CANCEL SUSPENDED ORDER
  // ---------------------------------------------------------
  ipcMain.handle('suspended-orders:cancel', async (event, { id }) => {
    try {
      const order = db.prepare('SELECT order_number FROM suspended_orders WHERE id = ?').get(id);
      
      if (!order) {
        return { success: false, error: 'Suspended order not found' };
      }

      db.prepare(`
        UPDATE suspended_orders
        SET status = 'cancelled'
        WHERE id = ?
      `).run(id);

      return { success: true, message: `Order #${order.order_number} cancelled` };
    } catch (err) {
      console.error('[suspended-orders:cancel] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerSuspendedOrdersIPC };