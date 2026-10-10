const { ipcMain } = require('electron');

function registerExpensesIPC(db) {
  ipcMain.handle('expenses:list', async (_event, { date_from, date_to } = {}) => {
    try {
      let sql = `
        SELECT e.*, u.display_name AS recorded_by_name
        FROM operational_expenses e
        LEFT JOIN users u ON u.id = e.recorded_by
        WHERE 1=1
      `;
      const params = [];

      if (date_from) {
        sql += ' AND DATE(e.expense_date) >= ?';
        params.push(date_from);
      }
      if (date_to) {
        sql += ' AND DATE(e.expense_date) <= ?';
        params.push(date_to);
      }

      sql += ' ORDER BY DATE(e.expense_date) DESC, e.id DESC';
      return { success: true, data: db.prepare(sql).all(...params) };
    } catch (err) {
      console.error('[expenses:list] Error:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  });

  ipcMain.handle('expenses:create', async (_event, expense = {}) => {
    try {
      const {
        expense_date,
        category,
        description,
        amount,
        payment_method,
        reference,
        notes,
        recorded_by,
      } = expense;
      const expenseDate = new Date(`${expense_date}T00:00:00Z`);

      if (!expense_date || Number.isNaN(expenseDate.getTime()) || expenseDate.toISOString().slice(0, 10) !== expense_date) {
        return { success: false, error: 'A valid expense date is required.' };
      }
      if (!String(category || '').trim() || !String(description || '').trim()) {
        return { success: false, error: 'Category and description are required.' };
      }
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        return { success: false, error: 'Amount must be greater than zero.' };
      }
      if (!['cash', 'card', 'transfer'].includes(payment_method)) {
        return { success: false, error: 'Select a valid payment method.' };
      }
      if (!Number.isInteger(Number(recorded_by)) || Number(recorded_by) <= 0) {
        return { success: false, error: 'Recorder user is required.' };
      }

      const result = db.prepare(`
        INSERT INTO operational_expenses
          (expense_date, category, description, amount, payment_method, reference, notes, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expense_date,
        String(category).trim(),
        String(description).trim(),
        Number(amount),
        payment_method,
        String(reference || '').trim() || null,
        String(notes || '').trim() || null,
        Number(recorded_by),
      );

      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (err) {
      console.error('[expenses:create] Error:', err.message);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerExpensesIPC };
