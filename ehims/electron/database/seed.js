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

}

module.exports = { seedDatabase };
