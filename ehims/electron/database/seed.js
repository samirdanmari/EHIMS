const bcrypt = require('bcryptjs');

function seedDatabase(db) {
    const checkAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    
    if (!checkAdmin) {
        const passwordHash = bcrypt.hashSync('admin123', 10);
        db.prepare(`
            INSERT INTO users (username, display_name, password_hash, pin, role)
            VALUES (?, ?, ?, ?, ?)
        `).run('admin', 'System Administrator', passwordHash, '1234', 'admin');
    }

    const checkCategory = db.prepare('SELECT count(*) as count FROM categories').get();
    
    if (checkCategory.count === 0) {
        const insertCat = db.prepare(`
            INSERT INTO categories (name, type, description)
            VALUES (?, ?, ?)
        `);
        
        insertCat.run('Food', 'both', 'Food items and prepared meals');
        insertCat.run('Beverages', 'both', 'Non-alcoholic drinks');
        insertCat.run('Spirits', 'both', 'Alcoholic beverages');
        insertCat.run('Soft Drinks', 'both', 'Sodas and juices');
        insertCat.run('Services', 'menu', 'Service charges and extras');
    }
}

module.exports = { seedDatabase };

// Add sample orders for dashboard (optional - only if table is empty)
function seedSampleOrders(db) {
  try {
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    
    if (orderCount.count > 0) {
      console.log('[Seed] Orders already exist, skipping sample data');
      return;
    }

    console.log('[Seed] Adding sample orders for dashboard...');

    const today = new Date().toISOString().slice(0, 10);
    
    // Create a few sample orders for today
    for (let i = 1; i <= 5; i++) {
      const orderId = db.prepare(`
        INSERT INTO orders (order_number, shift_id, cashier_id, table_number, subtotal, discount_amount, tax_amount, total_amount, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `ORD-${String(i).padStart(5, '0')}`,
        1,
        1,
        `${i}`,
        2500 + (i * 500),
        0,
        (2500 + (i * 500)) * 0.075,
        (2500 + (i * 500)) * 1.075,
        i % 2 === 0 ? 'cash' : 'card',
        'completed'
      ).lastInsertRowid;

      // Add some order items
      db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `).run(orderId, 1, i, 1000, i * 1000);

      if (i > 2) {
        db.prepare(`
          INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?)
        `).run(orderId, 2, 1, 1500, 1500);
      }
    }

    console.log('[Seed] Sample orders created successfully');
  } catch (err) {
    console.error('[Seed] Error creating sample orders:', err.message);
  }
}

// Export the function
module.exports.seedSampleOrders = seedSampleOrders;
