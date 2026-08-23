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
