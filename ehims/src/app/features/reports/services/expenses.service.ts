import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';

export type ExpensePaymentMethod = 'cash' | 'card' | 'transfer';

export interface OperationalExpense {
  id: number;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: ExpensePaymentMethod;
  reference: string | null;
  notes: string | null;
  recorded_by: number;
  recorded_by_name: string | null;
  created_at: string;
}

export interface OperationalExpenseInput {
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: ExpensePaymentMethod;
  reference?: string;
  notes?: string;
  recorded_by: number;
}

interface ExpenseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private electronService = inject(ElectronService);

  list(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ExpenseResponse<OperationalExpense[]>> {
    return this.electronService.invoke('expenses:list', {
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  create(
    expense: OperationalExpenseInput,
  ): Promise<ExpenseResponse<{ id: number }>> {
    return this.electronService.invoke('expenses:create', expense);
  }
}
