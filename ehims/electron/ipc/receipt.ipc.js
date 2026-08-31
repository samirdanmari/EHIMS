const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');

function registerReceiptIPC(db) {
  // ---------------------------------------------------------
  // PRINT RECEIPT
  // ---------------------------------------------------------
  ipcMain.handle('receipt:print', async (event, { orderId, orderNumber, items, subtotal, discount, tax, total, paymentMethod, customerName, tableNumber, notes }) => {
    try {
      // Get printer settings from database
      const settings = db.prepare('SELECT * FROM printer_settings LIMIT 1').get();
      const printerName = settings?.default_printer || null;

      if (!printerName) {
        return { success: false, error: 'No printer configured. Please configure printer in settings.' };
      }

      // Format receipt
      const lineWidth = settings?.line_width || 32;
      const receiptContent = formatReceipt({
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
        lineWidth,
      });

      // Print the receipt
      const printResult = await printToXprinter(printerName, receiptContent);

      if (printResult.success) {
        // Log the print action
        db.prepare(`
          INSERT INTO print_log (order_id, printer_name, status, printed_at)
          VALUES (?, ?, ?, datetime('now','localtime'))
        `).run(orderId, printerName, 'success');

        return { success: true, message: 'Receipt printed successfully' };
      } else {
        return { success: false, error: printResult.error || 'Failed to print receipt' };
      }
    } catch (err) {
      console.error('[receipt:print] Error:', err.message);
      return { success: false, error: err.message };
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
        return { success: false, error: 'No printer selected' };
      }

      const testReceipt = formatReceipt({
        orderNumber: '000001',
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
        lineWidth: settings?.line_width || 32,
      });

      const result = await printToXprinter(printer, testReceipt);
      return result;
    } catch (err) {
      console.error('[receipt:test-print] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
}

function formatReceipt({ orderNumber, items, subtotal, discount, tax, total, paymentMethod, customerName, tableNumber, notes, lineWidth }) {
  const line = '='.repeat(lineWidth);
  const dash = '-'.repeat(lineWidth);

  let receipt = `${line}\n`;
  receipt += centerText('RECEIPT', lineWidth) + '\n';
  receipt += `Order #: ${orderNumber}\n`;
  receipt += `Date: ${new Date().toLocaleString()}\n`;

  if (customerName) {
    receipt += `Customer: ${customerName}\n`;
  }

  if (tableNumber) {
    receipt += `Table: ${tableNumber}\n`;
  }

  receipt += `${line}\n\n`;
  receipt += 'Item                    Qty    Price   Total\n';
  receipt += `${dash}\n`;

  for (const item of items) {
    const itemLine = formatItemLine(item, lineWidth - 4);
    receipt += itemLine + '\n';
  }

  receipt += `${dash}\n`;
  receipt += rightAlignText(`Subtotal: ₦${subtotal.toFixed(2)}`, lineWidth) + '\n';

  if (discount && discount > 0) {
    receipt += rightAlignText(`Discount: -₦${discount.toFixed(2)}`, lineWidth) + '\n';
  }

  receipt += rightAlignText(`Tax: ₦${tax.toFixed(2)}`, lineWidth) + '\n';
  receipt += `${line}\n`;
  receipt += rightAlignText(`TOTAL: ₦${total.toFixed(2)}`, lineWidth) + '\n';
  receipt += `${line}\n\n`;

  receipt += centerText(`Payment: ${paymentMethod}`, lineWidth) + '\n';

  if (notes) {
    receipt += `\nNotes: ${notes}\n`;
  }

  receipt += `\n${centerText('Thank you for your purchase!', lineWidth)}\n`;
  receipt += `${centerText('Visit us again', lineWidth)}\n`;
  receipt += `${line}\n`;

  return receipt;
}

function formatItemLine(item, width) {
  const name = item.name.substring(0, 15).padEnd(15);
  const qty = item.quantity.toString().padStart(4);
  const price = `₦${item.unitPrice.toFixed(0)}`.padStart(7);
  const total = `₦${item.lineTotal.toFixed(0)}`.padStart(7);
  return `${name} ${qty}  ${price}  ${total}`;
}

function centerText(text, width) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function rightAlignText(text, width) {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text;
}

async function printToXprinter(printerName, content) {
  try {
    // For now, use Electron's print API with raw mode
    // In production, you'd use a library like 'node-thermal-printer' or 'xprinter-sdk'

    // This is a simulation - replace with actual xprinter implementation
    console.log(`[Xprinter] Printing to: ${printerName}`);
    console.log(`[Xprinter] Content length: ${content.length} characters`);

    // Simulate print success
    return { success: true, message: 'Receipt printed successfully' };

    // Real implementation would be:
    // const printer = new ThermalPrinter({
    //   type: 'epson',
    //   interface: 'usb',
    //   ip: 'YOUR_PRINTER_IP',
    //   port: 9100,
    //
    // });
    //
    // printer.clear();
    // printer.println(content);
    // await printer.execute();
    // return { success: true };
  } catch (err) {
    console.error('[printToXprinter] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { registerReceiptIPC };
