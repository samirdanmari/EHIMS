const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function registerReceiptIPC(db) {
  // ---------------------------------------------------------
  // PRINT RECEIPT using Electron's built-in print
  // ---------------------------------------------------------
  ipcMain.handle('receipt:print', async (event, { orderId, orderNumber, items, subtotal, discount, tax, total, paymentMethod, customerName, tableNumber, notes, reprint = false }) => {
    try {
      // Get printer settings from database
      const settings = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      const printerName = settings?.default_printer || null;
      const paperWidth = settings?.paper_width === '58mm' ? 58000 : 80000;

      if (!printerName) {
        return { success: false, error: 'No printer configured. Go to Settings → Printer Configuration to set up your printer.' };
      }

      // Get company profile and logo
      const company = db.prepare('SELECT * FROM company_settings LIMIT 1').get() || {};
      let logoBase64 = '';
      if (company && company.company_logo) {
        logoBase64 = Buffer.from(company.company_logo).toString('base64');
      }

      // Verify printer exists on the requesting renderer's printer list
      if (event.sender.isDestroyed()) {
        return { success: false, error: 'Cannot access printer list. Please try again.' };
      }
      const printers = await event.sender.getPrintersAsync();
      if (!printers.some((printer) => printer.name === printerName)) {
        return { success: false, error: `Printer "${printerName}" is not available.` };
      }

      // Format receipt as HTML
      const receiptHtml = formatReceiptHtml({
        orderNumber,
        items,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod,
        customerName,
        tableNumber,
        notes,
        logo: logoBase64,
        company,
        paperWidth,
        reprint
      });
      const paperHeight = getReceiptHeight({ company, items, logoBase64, notes });

      // Create temporary HTML file
      const tempDir = require('os').tmpdir();
      const tempFile = path.join(tempDir, `receipt-${Date.now()}.html`);
      fs.writeFileSync(tempFile, receiptHtml);

      // Print using Electron's print API
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      });

      await printWindow.loadFile(tempFile);

      const printSettings = {
        silent: true,
        deviceName: String(printerName),
        margins: { marginType: 'none' },
        scale: 100,
        pageSize: { width: paperWidth, height: paperHeight }
      };

      const printResult = await new Promise((resolve) => {
        printWindow.webContents.print(printSettings, (success, failureReason) => {
          printWindow.close();
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
          resolve({ success, failureReason });
        });
      });

      if (!printResult.success) {
        console.error(`[receipt:print] Printer rejected job for ${printerName}:`, printResult.failureReason);
        return { success: false, error: printResult.failureReason || 'Receipt print failed.' };
      }

      // Log the print action
      try {
        db.prepare(`
          INSERT INTO print_log (order_id, printer_name, status, printed_at)
          VALUES (?, ?, ?, datetime('now','localtime'))
        `).run(orderId, printerName, 'success');
      } catch (e) {
        console.log('Note: Could not log print');
      }

      console.log(`[receipt:print] Successfully printed order ${orderNumber} to ${printerName}`);
      return { success: true, message: 'Receipt printed successfully' };
    } catch (err) {
      console.error('[receipt:print] Error:', err.message);
      return { success: false, error: `Print failed: ${err.message}` };
    }
  });

  // ---------------------------------------------------------
  // TEST PRINT
  // ---------------------------------------------------------
  ipcMain.handle('receipt:test-print', async (event, { printerName } = {}) => {
    try {
      const settings = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      const printer = printerName || settings?.default_printer;

      if (!printer) {
        return { success: false, error: 'No printer selected. Please configure a printer first.' };
      }

      // Get company profile and logo
      const company = db.prepare('SELECT * FROM company_settings LIMIT 1').get() || {};
      let logoBase64 = '';
      if (company && company.company_logo) {
        logoBase64 = Buffer.from(company.company_logo).toString('base64');
      }

      const testHtml = formatReceiptHtml({
        orderNumber: 'TEST001',
        items: [
          { name: 'Test Item 1', quantity: 1, unitPrice: 2500, lineTotal: 2500 },
          { name: 'Test Item 2', quantity: 2, unitPrice: 1500, lineTotal: 3000 },
        ],
        subtotal: 5500,
        discount: 0,
        tax: 990,
        total: 6490,
        paymentMethod: 'Cash',
        customerName: 'Test Customer',
        tableNumber: '1',
        notes: 'Test Receipt',
        logo: logoBase64,
        company,
        paperWidth: settings?.paper_width === '58mm' ? 58000 : 80000
      });
      const paperWidth = settings?.paper_width === '58mm' ? 58000 : 80000;
      const paperHeight = getReceiptHeight({ company, items: [
        { name: 'Test Item 1' },
        { name: 'Test Item 2' }
      ], logoBase64, notes: 'Test Receipt' });

      const tempDir = require('os').tmpdir();
      const tempFile = path.join(tempDir, `receipt-test-${Date.now()}.html`);
      fs.writeFileSync(tempFile, testHtml);

      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      });

      await printWindow.loadFile(tempFile);

      const printSettings = {
        silent: true,
        deviceName: printer,
        margins: { marginType: 'none' },
        scale: 100,
        pageSize: { width: paperWidth, height: paperHeight }
      };

      const printResult = await new Promise((resolve) => {
        printWindow.webContents.print(printSettings, (success, failureReason) => {
          printWindow.close();
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
          resolve({ success, failureReason });
        });
      });

      if (!printResult.success) {
        return { success: false, error: printResult.failureReason || 'Test print failed.' };
      }

      console.log(`[receipt:test-print] Test page sent to ${printer}`);
      return { success: true, message: `Test page sent to printer "${printer}". Check your printer.` };
    } catch (err) {
      console.error('[receipt:test-print] Error:', err.message);
      return { success: false, error: `Test print failed: ${err.message}` };
    }
  });
}

function formatReceiptHtml({ orderNumber, items, subtotal, discount, tax, total, paymentMethod, customerName, tableNumber, notes, logo, company = {}, paperWidth = 80000, reprint = false }) {
  const logoHtml = logo ? `<div style="text-align: center; margin-bottom: 15px;"><img src="data:image/png;base64,${logo}" alt="Logo" style="max-width: 80px; max-height: 80px;"></div>` : '';
  const companyName = company.company_name || 'Your Company';
  const companyDetails = [
    company.address,
    company.phone,
    company.email,
    company.website,
    company.registration_number ? `Reg: ${company.registration_number}` : '',
    company.tax_id ? `Tax ID: ${company.tax_id}` : ''
  ].filter(Boolean).map(escapeHtml);
  const companyHtml = `
    <div class="company">
      <h1>${escapeHtml(companyName)}</h1>
      ${companyDetails.map((detail) => `<p>${detail}</p>`).join('')}
    </div>`;
  
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">₦${item.unitPrice.toFixed(0)}</td>
      <td style="text-align: right;">₦${item.lineTotal.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Courier New', monospace;
          width: ${paperWidth / 1000}mm;
          margin: 0;
          padding: 10px;
          background: white;
          color: black;
        }
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 14px;
          font-weight: bold;
        }
        .company {
          text-align: center;
          margin-bottom: 8px;
        }
        .company h1 {
          margin: 0;
          font-size: 15px;
          font-weight: bold;
        }
        .company p {
          margin: 2px 0;
          font-size: 9px;
        }
        .order-info {
          font-size: 11px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          font-size: 10px;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        th {
          border-bottom: 1px solid #000;
          padding: 3px 0;
          text-align: left;
          font-weight: bold;
          font-size: 10px;
        }
        td {
          padding: 2px 0;
        }
        .summary {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 8px 0;
          margin: 8px 0;
          font-size: 11px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .total {
          font-size: 12px;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 12px;
        }
        .footer p {
          margin: 3px 0;
        }
      </style>
    </head>
    <body>
      ${logoHtml}
      ${companyHtml}
      
      <div class="header">
        <h1>RECEIPT${reprint ? ' - RECEIPT REPRINTED' : ''}</h1>
        <p style="margin: 3px 0; font-size: 10px;">Order #${orderNumber}</p>
        <p style="margin: 3px 0; font-size: 10px;">${new Date().toLocaleString()}</p>
      </div>

      <div class="order-info">
        ${customerName ? `<p><strong>Customer:</strong> ${customerName}</p>` : ''}
        ${tableNumber ? `<p><strong>Table:</strong> ${tableNumber}</p>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>₦${subtotal.toFixed(2)}</span>
        </div>
        ${discount > 0 ? `
          <div class="summary-row">
            <span>Discount:</span>
            <span>-₦${discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="summary-row">
          <span>Tax:</span>
          <span>₦${tax.toFixed(2)}</span>
        </div>
        <div class="summary-row total">
          <span>TOTAL:</span>
          <span>₦${total.toFixed(2)}</span>
        </div>
      </div>

      <div style="font-size: 10px; margin-bottom: 8px;">
        <strong>Payment:</strong> ${paymentMethod}
      </div>

      ${notes ? `<div style="font-size: 9px; margin-bottom: 8px;"><strong>Notes:</strong> ${notes}</div>` : ''}

      <div class="footer">
        <p>Thank you for your purchase!</p>
        <p>Visit us again</p>
      </div>
    </body>
    </html>
  `;
}

function getReceiptHeight({ company = {}, items = [], logoBase64 = '', notes = '' }) {
  const detailLines = [
    company.address,
    company.phone,
    company.email,
    company.website,
    company.registration_number,
    company.tax_id
  ].filter(Boolean).length;
  const logoHeight = logoBase64 ? 28 : 0;
  const notesHeight = notes ? 8 : 0;
  // Leave room for the receipt header, totals, payment method, and footer.
  const heightMm = Math.min(
    300,
    Math.max(80, 92 + detailLines * 4 + items.length * 7 + logoHeight + notesHeight),
  );
  return heightMm * 1000;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { registerReceiptIPC };
