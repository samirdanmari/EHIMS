const { ipcMain } = require('electron');

function registerSettingsIPC(db) {
  // ---------------------------------------------------------
  // COMPANY SETTINGS
  // ---------------------------------------------------------
  ipcMain.handle('settings:get-company', async (event) => {
    try {
      let settings = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
      
      // If no settings exist, create default
      if (!settings) {
        db.prepare(`
          INSERT INTO company_settings 
          (company_name, currency, timezone, business_hours_open, business_hours_close)
          VALUES (?, ?, ?, ?, ?)
        `).run('My Restaurant', 'NGN', 'Africa/Lagos', '08:00', '20:00');
        
        settings = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
      }

      return { success: true, data: settings };
    } catch (err) {
      console.error('[settings:get-company] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:update-company', async (event, payload) => {
    try {
      const { company_name, registration_number, tax_id, address, phone, email, website, currency, timezone, business_hours_open, business_hours_close } = payload;

      const existing = db.prepare('SELECT id FROM company_settings LIMIT 1').get();

      if (existing) {
        db.prepare(`
          UPDATE company_settings SET
            company_name = ?,
            registration_number = ?,
            tax_id = ?,
            address = ?,
            phone = ?,
            email = ?,
            website = ?,
            currency = ?,
            timezone = ?,
            business_hours_open = ?,
            business_hours_close = ?,
            updated_at = datetime('now','localtime')
          WHERE id = ?
        `).run(company_name, registration_number, tax_id, address, phone, email, website, currency, timezone, business_hours_open, business_hours_close, existing.id);
      } else {
        db.prepare(`
          INSERT INTO company_settings
          (company_name, registration_number, tax_id, address, phone, email, website, currency, timezone, business_hours_open, business_hours_close)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(company_name, registration_number, tax_id, address, phone, email, website, currency, timezone, business_hours_open, business_hours_close);
      }

      const updated = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
      return { success: true, data: updated };
    } catch (err) {
      console.error('[settings:update-company] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // PRINTER SETTINGS
  // ---------------------------------------------------------
  ipcMain.handle('settings:get-printer', async (event) => {
    try {
      let settings = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      
      if (!settings) {
        db.prepare(`
          INSERT INTO printer_settings 
          (paper_width, font_size_normal, font_size_small, font_size_large, logo_on_receipt, line_width)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run('58mm', 12, 10, 14, 1, 32);
        
        settings = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      }

      // Convert boolean from SQLite (0/1)
      if (settings) {
        settings.logo_on_receipt = settings.logo_on_receipt === 1;
      }

      return { success: true, data: settings };
    } catch (err) {
      console.error('[settings:get-printer] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:update-printer', async (event, payload) => {
    try {
      const { default_printer, paper_width, font_size_normal, font_size_small, font_size_large, logo_on_receipt, line_width } = payload;

      const existing = db.prepare('SELECT id FROM printer_settings LIMIT 1').get();

      if (existing) {
        db.prepare(`
          UPDATE printer_settings SET
            default_printer = ?,
            paper_width = ?,
            font_size_normal = ?,
            font_size_small = ?,
            font_size_large = ?,
            logo_on_receipt = ?,
            line_width = ?,
            updated_at = datetime('now','localtime')
          WHERE id = ?
        `).run(default_printer, paper_width, font_size_normal, font_size_small, font_size_large, logo_on_receipt ? 1 : 0, line_width, existing.id);
      } else {
        db.prepare(`
          INSERT INTO printer_settings
          (default_printer, paper_width, font_size_normal, font_size_small, font_size_large, logo_on_receipt, line_width)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(default_printer, paper_width, font_size_normal, font_size_small, font_size_large, logo_on_receipt ? 1 : 0, line_width);
      }

      const updated = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      if (updated) {
        updated.logo_on_receipt = updated.logo_on_receipt === 1;
      }

      return { success: true, data: updated };
    } catch (err) {
      console.error('[settings:update-printer] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerSettingsIPC };
