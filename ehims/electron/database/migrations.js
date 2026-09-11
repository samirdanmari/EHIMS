function runMigrations(db) {
    db.exec(`
        -- USERS & RBAC
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            pin TEXT,
            role TEXT NOT NULL CHECK(role IN ('admin','manager','storekeeper','cashier','waiter')),
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            login_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            logout_at TEXT,
            ip_address TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            synced INTEGER NOT NULL DEFAULT 0
        );

        -- INVENTORY
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL CHECK(type IN ('inventory','menu','both')),
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER REFERENCES categories(id),
            unit TEXT NOT NULL DEFAULT 'pcs',
            cost_price REAL NOT NULL DEFAULT 0,
            opening_stock REAL NOT NULL DEFAULT 0,
            current_stock REAL NOT NULL DEFAULT 0,
            low_stock_threshold REAL NOT NULL DEFAULT 5,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            synced INTEGER NOT NULL DEFAULT 0
        );

        -- SUPPLIERS
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            account_number TEXT,
            bank_name TEXT,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            payment_terms TEXT NOT NULL DEFAULT 'COD' CHECK(payment_terms IN ('COD','Net7','Net14','Net30','Net60')),
            credit_balance REAL NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS purchase_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER REFERENCES suppliers(id),
            item_id INTEGER NOT NULL REFERENCES inventory_items(id),
            quantity REAL NOT NULL,
            unit_cost REAL NOT NULL,
            total_cost REAL NOT NULL,
            payment_method TEXT CHECK(payment_method IN ('cash','credit','bank_transfer','cheque')),
            is_credit INTEGER NOT NULL DEFAULT 0,
            received_by INTEGER NOT NULL REFERENCES users(id),
            purchase_date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            notes TEXT,
            synced INTEGER NOT NULL DEFAULT 0
        );

       -- SHIFTS & STOCK ISSUANCE
        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_name TEXT NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id),
            start_time TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            end_time TEXT,
            opening_cash REAL NOT NULL DEFAULT 0,
            closing_cash REAL,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
            notes TEXT,
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS stock_issuances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_id INTEGER NOT NULL REFERENCES shifts(id),
            issued_by INTEGER NOT NULL REFERENCES users(id),
            received_by INTEGER NOT NULL REFERENCES users(id),
            issued_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            created_at TEXT,
            notes TEXT,
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS stock_issuance_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issuance_id INTEGER NOT NULL REFERENCES stock_issuances(id),
            item_id INTEGER NOT NULL REFERENCES inventory_items(id),
            quantity REAL NOT NULL,
            unit_cost REAL NOT NULL,
            total_cost REAL NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
        );

          -- POS
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER REFERENCES categories(id),
            selling_price REAL NOT NULL,
            inventory_item_id INTEGER REFERENCES inventory_items(id),
            is_available INTEGER NOT NULL DEFAULT 1,
            image_path TEXT,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            synced INTEGER NOT NULL DEFAULT 0
        );

        -- Junction table: links a menu item to multiple inventory items
        CREATE TABLE IF NOT EXISTS menu_item_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
            inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
            quantity REAL NOT NULL DEFAULT 1,
             created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            UNIQUE(menu_item_id, inventory_item_id)
        );

        -- Normalized purchase entry header (many items per entry)
        CREATE TABLE IF NOT EXISTS purchase_entry_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id INTEGER NOT NULL REFERENCES purchase_entries(id) ON DELETE CASCADE,
            item_id INTEGER NOT NULL REFERENCES inventory_items(id),
            quantity REAL NOT NULL,
            unit_cost REAL NOT NULL,
            total_cost REAL NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT NOT NULL UNIQUE,
            shift_id INTEGER REFERENCES shifts(id),
            cashier_id INTEGER NOT NULL REFERENCES users(id),
            waiter_id INTEGER REFERENCES users(id),
            table_number TEXT,
            subtotal REAL NOT NULL DEFAULT 0,
            discount_amount REAL NOT NULL DEFAULT 0,
            discount_reason TEXT,
            discount_approved_by INTEGER REFERENCES users(id),
            tax_amount REAL NOT NULL DEFAULT 0,
            total_amount REAL NOT NULL DEFAULT 0,
            payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','card','transfer','split')),
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','preparing','served','completed','voided')),
            void_reason TEXT,
            void_approved_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            completed_at TEXT,
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES orders(id),
            menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','preparing','served','cancelled')),
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS supplier_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','bank_transfer','cheque')),
            reference_number TEXT,
            recorded_by INTEGER NOT NULL REFERENCES users(id),
            payment_date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            notes TEXT,
            synced INTEGER NOT NULL DEFAULT 0
        );

        -- EOD
        CREATE TABLE IF NOT EXISTS eod_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_date TEXT NOT NULL UNIQUE,
            total_sales REAL NOT NULL DEFAULT 0,
            total_cogs REAL NOT NULL DEFAULT 0,
            gross_profit REAL NOT NULL DEFAULT 0,
            total_discounts REAL NOT NULL DEFAULT 0,
            total_voids REAL NOT NULL DEFAULT 0,
            net_profit REAL NOT NULL DEFAULT 0,
            total_orders INTEGER NOT NULL DEFAULT 0,
            total_purchases REAL NOT NULL DEFAULT 0,
            cash_collected REAL NOT NULL DEFAULT 0,
            card_collected REAL NOT NULL DEFAULT 0,
            transfer_collected REAL NOT NULL DEFAULT 0,
            low_stock_items TEXT,
            generated_by INTEGER REFERENCES users(id),
            generated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            notes TEXT,
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS shift_handovers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_id INTEGER NOT NULL REFERENCES shifts(id),
            outgoing_user INTEGER NOT NULL REFERENCES users(id),
            incoming_user INTEGER REFERENCES users(id),
            drawer_cash REAL NOT NULL DEFAULT 0,
            expected_cash REAL NOT NULL DEFAULT 0,
            variance REAL NOT NULL DEFAULT 0,
            stock_verified INTEGER NOT NULL DEFAULT 0,
            outgoing_signature TEXT,
            incoming_signature TEXT,
            handover_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            notes TEXT,
            synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name TEXT NOT NULL,
            record_id INTEGER NOT NULL,
            action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
            synced_at TEXT,
            error TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS company_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            company_logo BLOB,
            registration_number TEXT,
            tax_id TEXT,
            address TEXT,
            phone TEXT,
            email TEXT,
            website TEXT,
            currency TEXT DEFAULT 'NGN',
            timezone TEXT DEFAULT 'Africa/Lagos',
            business_hours_open TEXT DEFAULT '08:00',
            business_hours_close TEXT DEFAULT '20:00',
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS printer_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            default_printer TEXT,
            paper_width TEXT DEFAULT '58mm',
            font_size_normal INTEGER DEFAULT 12,
            font_size_small INTEGER DEFAULT 10,
            font_size_large INTEGER DEFAULT 14,
            logo_on_receipt INTEGER DEFAULT 1,
            line_width INTEGER DEFAULT 32,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS suspended_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT NOT NULL UNIQUE,
            customer_name TEXT,
            table_number TEXT,
            items TEXT NOT NULL,
            subtotal REAL NOT NULL DEFAULT 0,
            discount_amount REAL,
            tax_amount REAL,
            notes TEXT,
            suspended_by INTEGER NOT NULL REFERENCES users(id),
            suspended_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            retrieved_at TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'retrieved', 'cancelled')),
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS print_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES orders(id),
            printer_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'failed')),
            error_message TEXT,
            printed_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );
    `);

    // -------------------------------------------------------------------------
    // REGULAR CUSTOMERS
    // -------------------------------------------------------------------------
    db.exec(`
        CREATE TABLE IF NOT EXISTS regular_customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone TEXT UNIQUE,
            email TEXT,
            address TEXT,
            notes TEXT,
            credit_limit REAL NOT NULL DEFAULT 0,
            outstanding_balance REAL NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS customer_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL REFERENCES regular_customers(id),
            order_id INTEGER REFERENCES orders(id),
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','card','transfer')),
            reference TEXT,
            recorded_by INTEGER NOT NULL REFERENCES users(id),
            payment_date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            notes TEXT
        );
    `);

    

    // -------------------------------------------------------------------------
    // ALTER TABLE guards — orders new columns
    // -------------------------------------------------------------------------
    const orderColumns = db.prepare('PRAGMA table_info(orders)').all();

    if (!orderColumns.some(c => c.name === 'customer_id')) {
        db.exec(`ALTER TABLE orders ADD COLUMN customer_id INTEGER REFERENCES regular_customers(id);`);
    }
    if (!orderColumns.some(c => c.name === 'is_credit')) {
        db.exec(`ALTER TABLE orders ADD COLUMN is_credit INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!orderColumns.some(c => c.name === 'credit_status')) {
        db.exec(`ALTER TABLE orders ADD COLUMN credit_status TEXT DEFAULT 'paid'
            CHECK(credit_status IN ('paid','unpaid','partial'));`);
    }

    // -------------------------------------------------------------------------
    // Existing ALTER TABLE guards
    // -------------------------------------------------------------------------
    const orderItemColumns = db.prepare('PRAGMA table_info(order_items)').all();
    const hasOrderItemCreatedAt = orderItemColumns.some((column) => column.name === 'created_at');

    if (!hasOrderItemCreatedAt) {
        db.exec(`
            ALTER TABLE order_items ADD COLUMN created_at TEXT;
        `);

        db.prepare(`
            UPDATE order_items
            SET created_at = datetime('now','localtime')
            WHERE created_at IS NULL
        `).run();
    }

    const stockIssuanceColumns = db.prepare('PRAGMA table_info(stock_issuances)').all();
    const hasStockIssuanceCreatedAt = stockIssuanceColumns.some((column) => column.name === 'created_at');

    if (!hasStockIssuanceCreatedAt) {
        db.exec(`
            ALTER TABLE stock_issuances ADD COLUMN created_at TEXT;
        `);

        db.prepare(`
            UPDATE stock_issuances
            SET created_at = issued_at
            WHERE created_at IS NULL
        `).run();
    }

    const supplierColumns = db.prepare('PRAGMA table_info(suppliers)').all();
    const hasAccountNumber = supplierColumns.some((column) => column.name === 'account_number');
    const hasBankName = supplierColumns.some((column) => column.name === 'bank_name');

    if (!hasAccountNumber) {
        db.exec(`
            ALTER TABLE suppliers ADD COLUMN account_number TEXT;
        `);
    }

    if (!hasBankName) {
        db.exec(`
            ALTER TABLE suppliers ADD COLUMN bank_name TEXT;
        `);
    }
}

module.exports = { runMigrations };