const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

function registerReceiptIPC(db) {
  // ---------------------------------------------------------
  // PRINT RECEIPT
  // ---------------------------------------------------------
  ipcMain.handle('receipt:print', async (event, {
    orderId, orderNumber, items, subtotal, discount, tax, total,
    paymentMethod, customerName, tableNumber, notes, reprint = false,
    isCredit = false
  }) => {
    try {
      const settings = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      const printerName = settings?.default_printer || null;
      const paperWidthMicrons = settings?.paper_width === '58mm' ? 58000 : 80000;

      if (!printerName) {
        return { success: false, error: 'No printer configured. Go to Settings → Printer Configuration.' };
      }

      if (event.sender.isDestroyed()) {
        return { success: false, error: 'Cannot access printer. Please try again.' };
      }

      const printers = await event.sender.getPrintersAsync();
      if (!printers.some(p => p.name === printerName)) {
        return { success: false, error: `Printer "${printerName}" is not available.` };
      }

      const company = db.prepare('SELECT * FROM company_settings LIMIT 1').get() || {};
      let logoBase64 = '';
      if (company.company_logo) {
        logoBase64 = Buffer.from(company.company_logo).toString('base64');
      }

      // Build single HTML with BOTH copies (customer + merchant) back-to-back
      // so the thermal printer fires only ONE auto-cut at the very end.
      const html = buildMergedReceiptHtml({
        orderNumber, items, subtotal, discount, tax, total,
        paymentMethod, customerName, tableNumber, notes,
        logo: logoBase64, company, paperWidthMicrons, reprint, isCredit
      });

      const result = await printHtml(html, printerName, paperWidthMicrons);

      if (!result.success) {
        throw new Error(result.failureReason || 'Receipt print failed.');
      }

      // Log the print action
      try {
        db.prepare(`
          INSERT INTO print_log (order_id, printer_name, status, printed_at)
          VALUES (?, ?, ?, datetime('now','localtime'))
        `).run(orderId || 0, printerName, 'success');
      } catch (_) { /* non-fatal */ }

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

      const company = db.prepare('SELECT * FROM company_settings LIMIT 1').get() || {};
      let logoBase64 = '';
      if (company.company_logo) {
        logoBase64 = Buffer.from(company.company_logo).toString('base64');
      }

      const paperWidthMicrons = settings?.paper_width === '58mm' ? 58000 : 80000;

      const html = buildMergedReceiptHtml({
        orderNumber: 'TEST-001',
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
        notes: 'Test receipt — printer OK',
        logo: logoBase64,
        company,
        paperWidthMicrons,
        reprint: false,
        isCredit: false
      });

      const result = await printHtml(html, printer, paperWidthMicrons);

      if (!result.success) {
        return { success: false, error: result.failureReason || 'Test print failed.' };
      }

      return { success: true, message: `Test page sent to printer "${printer}". Check your printer.` };
    } catch (err) {
      console.error('[receipt:test-print] Error:', err.message);
      return { success: false, error: `Test print failed: ${err.message}` };
    }
  });
}

// ---------------------------------------------------------
// Core: write HTML to temp file, open window, measure, print
// ---------------------------------------------------------
async function printHtml(html, printerName, paperWidthMicrons) {
  const tempFile = path.join(os.tmpdir(), `receipt-${Date.now()}.html`);
  fs.writeFileSync(tempFile, html, 'utf8');

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  try {
    await printWindow.loadFile(tempFile);

    // Measure the actual rendered height AFTER fonts + images load
    const paperHeightMicrons = await getRenderedHeight(printWindow);

    return await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          deviceName: printerName,
          margins: { marginType: 'none' },
          pageSize: {
            width: paperWidthMicrons,
            height: paperHeightMicrons
          }
        },
        (success, failureReason) => resolve({ success, failureReason })
      );
    });
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close();
    try { fs.unlinkSync(tempFile); } catch (_) { /* ignore */ }
  }
}

// ---------------------------------------------------------
// Measure full rendered scroll height and convert to microns
// ---------------------------------------------------------
async function getRenderedHeight(printWindow) {
  const heightPx = await printWindow.webContents.executeJavaScript(`
    new Promise(async (resolve) => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolveImages) => {
        const images = Array.from(document.images);
        if (!images.length) { resolveImages(); return; }
        let completed = 0;
        const done = () => { if (++completed >= images.length) resolveImages(); };
        images.forEach(img => {
          if (img.complete) done();
          else {
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          }
        });
      });

      resolve(Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ));
    });
  `);

  // Convert CSS px (96 dpi) → mm → microns (1 mm = 1000 µm)
  return Math.max(10000, Math.ceil((Number(heightPx) * 25.4 / 96) * 1000));
}

// ---------------------------------------------------------
// Build merged receipt HTML (customer copy + merchant copy)
// in one document so only ONE print job and ONE auto-cut fires.
// ---------------------------------------------------------
function buildMergedReceiptHtml({
  orderNumber, items, subtotal, discount, tax, total,
  paymentMethod, customerName, tableNumber, notes,
  logo, company = {}, paperWidthMicrons = 80000,
  reprint = false, isCredit = false
}) {
  const widthMm = paperWidthMicrons / 1000;

  const customerCopy = buildReceiptBlock({
    orderNumber, items, subtotal, discount, tax, total,
    paymentMethod, customerName, tableNumber, notes,
    logo, company, copyLabel: 'Customer Copy', reprint, isCredit
  });

  const merchantCopy = buildReceiptBlock({
    orderNumber, items, subtotal, discount, tax, total,
    paymentMethod, customerName, tableNumber, notes,
    logo, company, copyLabel: 'Merchant Copy', reprint, isCredit
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: ${widthMm}mm auto; margin: 0; }

    *, *::before, *::after { box-sizing: border-box; }

    html, body {
      width: ${widthMm}mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'Courier New', monospace;
      line-height: 1.1;
      font-size: 9px;
    }

    /* ---- receipt block ---- */
    .receipt {
      width: 100%;
      padding: 4px 6px;
    }

    .copy-tag {
      text-align: center;
      font-size: 8px;
      font-weight: bold;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin: 0 0 2px;
    }

    .logo-wrap {
      text-align: center;
      margin: 0 0 2px;
    }
    .logo-wrap img {
      max-width: 48px;
      max-height: 48px;
    }

    .company-name {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      margin: 0 0 1px;
    }
    .company-detail {
      text-align: center;
      font-size: 7px;
      margin: 0;
    }

    .divider-dashed {
      border: none;
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    .divider-solid {
      border: none;
      border-top: 1px solid #000;
      margin: 2px 0;
    }

    .receipt-title {
      text-align: center;
      font-size: 10px;
      font-weight: bold;
      margin: 0;
    }
    .receipt-meta {
      font-size: 8px;
      margin: 0;
    }

    .order-info p {
      font-size: 8px;
      margin: 0;
    }

    table {
      width: 100%;
      font-size: 8px;
      border-collapse: collapse;
    }
    th {
      font-size: 8px;
      font-weight: bold;
      text-align: left;
      padding: 1px 0;
      border-bottom: 1px solid #000;
    }
    td {
      padding: 1px 0;
      vertical-align: top;
    }

    .summary {
      font-size: 8px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin: 1px 0;
    }
    .summary-row.total-row {
      font-size: 10px;
      font-weight: bold;
    }

    .payment-info {
      font-size: 8px;
      margin: 0;
    }
    .credit-badge {
      display: inline-block;
      border: 1px solid #000;
      padding: 0 3px;
      font-size: 8px;
      font-weight: bold;
    }

    .notes-line {
      font-size: 8px;
      margin: 1px 0 0;
    }

    .footer {
      text-align: center;
      font-size: 8px;
      margin: 2px 0 0;
    }
    .footer p { margin: 0; }

    /* separator between the two copies */
    .copy-separator {
      border: none;
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="receipt">
    ${customerCopy}
  </div>

  <hr class="copy-separator">

  <div class="receipt">
    ${merchantCopy}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------
// Build one receipt block (either Customer or Merchant copy)
// ---------------------------------------------------------
function buildReceiptBlock({
  orderNumber, items, subtotal, discount, tax, total,
  paymentMethod, customerName, tableNumber, notes,
  logo, company = {}, copyLabel, reprint, isCredit
}) {
  const logoHtml = logo
    ? `<div class="logo-wrap"><img src="data:image/png;base64,${logo}" alt="Logo"></div>`
    : '';

  const companyName = company.company_name || 'Your Company';
  const companyDetails = [
    company.address,
    company.phone,
    company.email,
    company.website,
    company.registration_number ? `Reg: ${company.registration_number}` : '',
    company.tax_id ? `Tax ID: ${company.tax_id}` : ''
  ].filter(Boolean);

  const itemRows = items.map(item => `
    <tr>
      <td>${esc(item.name)}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">&#8358;${Number(item.unitPrice).toLocaleString('en-NG')}</td>
      <td style="text-align:right">&#8358;${Number(item.lineTotal).toFixed(2)}</td>
    </tr>`).join('');

  const discountRow = (discount && discount > 0)
    ? `<div class="summary-row"><span>Discount:</span><span>-&#8358;${Number(discount).toFixed(2)}</span></div>`
    : '';

  const paymentLabel = isCredit
    ? `<span class="credit-badge">CREDIT</span>`
    : esc(paymentMethod);

  const dateStr = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium', timeStyle: 'short'
  });

  return `
    <p class="copy-tag">${esc(copyLabel)}${reprint ? ' &bull; Reprint' : ''}</p>
    ${logoHtml}
    <p class="company-name">${esc(companyName)}</p>
    ${companyDetails.map(d => `<p class="company-detail">${esc(d)}</p>`).join('')}

    <hr class="divider-dashed">

    <p class="receipt-title">RECEIPT</p>
    <p class="receipt-meta">Order #: ${esc(orderNumber)}</p>
    <p class="receipt-meta">${dateStr}</p>

    <div class="order-info">
      ${customerName ? `<p><strong>Customer:</strong> ${esc(customerName)}</p>` : ''}
      ${tableNumber ? `<p><strong>Table:</strong> ${esc(tableNumber)}</p>` : ''}
    </div>

    <hr class="divider-dashed">

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Price</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <hr class="divider-dashed">

    <div class="summary">
      <div class="summary-row"><span>Subtotal:</span><span>&#8358;${Number(subtotal).toFixed(2)}</span></div>
      ${discountRow}
      <div class="summary-row"><span>Tax:</span><span>&#8358;${Number(tax).toFixed(2)}</span></div>
    </div>

    <hr class="divider-solid">

    <div class="summary">
      <div class="summary-row total-row"><span>TOTAL:</span><span>&#8358;${Number(total).toFixed(2)}</span></div>
    </div>

    <p class="payment-info"><strong>Payment:</strong> ${paymentLabel}</p>
    ${notes ? `<p class="notes-line"><strong>Notes:</strong> ${esc(notes)}</p>` : ''}

    <hr class="divider-dashed">

    <div class="footer">
      <p>Thank you for your purchase!</p>
      <p>Please visit us again</p>
    </div>`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { registerReceiptIPC };
