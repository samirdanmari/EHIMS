const { ipcMain } = require('electron');

function registerSettingsIPC(db) {
  // ---------------------------------------------------------
  // GET COMPANY SETTINGS
  // ---------------------------------------------------------
  ipcMain.handle('settings:get-company', async (event) => {
    try {
      const settings = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
      
      if (!settings) {
        return {
          success: true,
          data: {
            company_name: 'Your Company',
            currency: 'NGN',
            timezone: 'Africa/Lagos',
            business_hours_open: '08:00',
            business_hours_close: '20:00',
            company_logo: null
          }
        };
      }

      return { success: true, data: settings };
    } catch (err) {
      console.error('[settings:get-company] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // UPDATE COMPANY SETTINGS
  // ---------------------------------------------------------
  ipcMain.handle('settings:update-company', async (event, { 
    company_name, 
    registration_number, 
    tax_id, 
    address, 
    phone, 
    email, 
    website,
    currency,
    timezone,
    business_hours_open,
    business_hours_close
  }) => {
    try {
      const existing = db.prepare('SELECT id FROM company_settings LIMIT 1').get();

      if (existing) {
        db.prepare(`
          UPDATE company_settings
          SET company_name = ?,
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
        `).run(
          company_name || 'Your Company',
          registration_number || null,
          tax_id || null,
          address || null,
          phone || null,
          email || null,
          website || null,
          currency || 'NGN',
          timezone || 'Africa/Lagos',
          business_hours_open || '08:00',
          business_hours_close || '20:00',
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO company_settings (
            company_name, registration_number, tax_id, address, phone, email, website,
            currency, timezone, business_hours_open, business_hours_close
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          company_name || 'Your Company',
          registration_number || null,
          tax_id || null,
          address || null,
          phone || null,
          email || null,
          website || null,
          currency || 'NGN',
          timezone || 'Africa/Lagos',
          business_hours_open || '08:00',
          business_hours_close || '20:00'
        );
      }

      const settings = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
      console.log('[settings:update-company] Updated company settings');
      return { success: true, data: settings };
    } catch (err) {
      console.error('[settings:update-company] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // UPLOAD COMPANY LOGO
  // ---------------------------------------------------------
  ipcMain.handle('settings:upload-logo', async (event, { logoBase64 }) => {
    try {
      if (!logoBase64) {
        return { success: false, error: 'Logo data is required' };
      }

      let base64Data = logoBase64;
      if (logoBase64.includes(',')) {
        base64Data = logoBase64.split(',')[1];
      }

      const logoBuffer = Buffer.from(base64Data, 'base64');
      const existing = db.prepare('SELECT id FROM company_settings LIMIT 1').get();

      if (existing) {
        db.prepare(`
          UPDATE company_settings
          SET company_logo = ?,
              updated_at = datetime('now','localtime')
          WHERE id = ?
        `).run(logoBuffer, existing.id);
      } else {
        db.prepare(`
          INSERT INTO company_settings (company_name, company_logo)
          VALUES (?, ?)
        `).run('Your Company', logoBuffer);
      }

      const settings = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
      console.log('[settings:upload-logo] Logo uploaded:', logoBuffer.length, 'bytes');
      return { success: true, message: 'Logo uploaded successfully', data: settings };
    } catch (err) {
      console.error('[settings:upload-logo] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // DELETE COMPANY LOGO
  // ---------------------------------------------------------
  ipcMain.handle('settings:delete-logo', async (event) => {
    try {
      db.prepare(`
        UPDATE company_settings
        SET company_logo = NULL,
            updated_at = datetime('now','localtime')
        WHERE id = (SELECT id FROM company_settings LIMIT 1)
      `).run();

      const settings = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
      console.log('[settings:delete-logo] Logo deleted');
      return { success: true, message: 'Logo deleted successfully', data: settings };
    } catch (err) {
      console.error('[settings:delete-logo] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
  // ---------------------------------------------------------
  // GET PRINTER SETTINGS
  // ---------------------------------------------------------
  ipcMain.handle('settings:get-printer', async (event) => {
    try {
      const settings = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      if (!settings) {
        return {
          success: true,
          data: {
            default_printer: null,
            paper_width: '80mm',
            font_size_normal: 12,
            font_size_small: 10,
            font_size_large: 14,
            logo_on_receipt: 1,
            line_width: 32
          }
        };
      }

      return { success: true, data: settings };
    } catch (err) {
      console.error('[settings:get-printer] Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ---------------------------------------------------------
  // UPDATE PRINTER SETTINGS
  // ---------------------------------------------------------
  ipcMain.handle('settings:update-printer', async (event, { 
    default_printer,
    paper_width,
    font_size_normal,
    font_size_small,
    font_size_large,
    logo_on_receipt,
    line_width
  }) => {
    try {
      const existing = db.prepare('SELECT id FROM printer_settings LIMIT 1').get();

      if (existing) {
        // Update existing
        db.prepare(`
          UPDATE printer_settings
          SET default_printer = ?,
              paper_width = ?,
              font_size_normal = ?,
              font_size_small = ?,
              font_size_large = ?,
              logo_on_receipt = ?,
              line_width = ?,
              updated_at = datetime('now','localtime')
          WHERE id = ?
        `).run(
          default_printer || null,
          paper_width || '80mm',
          font_size_normal || 12,
          font_size_small || 10,
          font_size_large || 14,
          logo_on_receipt !== undefined ? (logo_on_receipt ? 1 : 0) : 1,
          line_width || 32,
          existing.id
        );
      } else {
        // Create new
        db.prepare(`
          INSERT INTO printer_settings (
            default_printer, paper_width, font_size_normal, font_size_small,
            font_size_large, logo_on_receipt, line_width
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          default_printer || null,
          paper_width || '80mm',
          font_size_normal || 12,
          font_size_small || 10,
          font_size_large || 14,
          logo_on_receipt !== undefined ? (logo_on_receipt ? 1 : 0) : 1,
          line_width || 32
        );
      }

      const settings = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      console.log('[settings:update-printer] Updated printer settings');
      return { success: true, data: settings };
    } catch (err) {
      console.error('[settings:update-printer] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerSettingsIPC };
