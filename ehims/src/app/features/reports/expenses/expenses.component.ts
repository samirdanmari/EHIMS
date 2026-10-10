import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import {
  ExpensePaymentMethod,
  ExpensesService,
  OperationalExpense,
} from '../services/expenses.service';

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.scss'],
})
export class ExpensesComponent implements OnInit {
  private expensesService = inject(ExpensesService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  readonly categories = [
    'Rent',
    'Utilities',
    'Salaries',
    'Transport',
    'Maintenance',
    'Supplies',
    'Marketing',
    'Other',
  ];
  readonly paymentMethods: ExpensePaymentMethod[] = [
    'cash',
    'card',
    'transfer',
  ];
  readonly expenses = signal<OperationalExpense[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly totalExpenses = computed(() =>
    this.expenses().reduce((total, expense) => total + expense.amount, 0),
  );

  readonly dateFrom = signal(
    localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  readonly dateTo = signal(localDate(new Date()));
  readonly expenseForm = new FormGroup({
    expense_date: new FormControl(localDate(new Date()), Validators.required),
    category: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    payment_method: new FormControl<ExpensePaymentMethod>(
      'cash',
      Validators.required,
    ),
    reference: new FormControl(''),
    notes: new FormControl(''),
  });

  async ngOnInit() {
    await this.loadExpenses();
    this.isLoading.set(false);
  }

  async loadExpenses() {
    try {
      const response = await this.expensesService.list(
        this.dateFrom() || undefined,
        this.dateTo() || undefined,
      );
      if (response.success && response.data) {
        this.expenses.set(response.data);
      } else {
        this.notificationService.error(
          'Expenses unavailable',
          response.error || 'Could not load expenses.',
        );
      }
    } catch {
      this.notificationService.error(
        'Expenses unavailable',
        'Could not load expenses.',
      );
    }
  }

  async recordExpense() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.notificationService.error(
        'Not signed in',
        'Could not identify the current user.',
      );
      return;
    }

    this.isSaving.set(true);
    const value = this.expenseForm.getRawValue();
    try {
      const response = await this.expensesService.create({
        expense_date: value.expense_date!,
        category: value.category!,
        description: value.description!,
        amount: value.amount!,
        payment_method: value.payment_method!,
        reference: value.reference || undefined,
        notes: value.notes || undefined,
        recorded_by: userId,
      });

      if (!response.success) {
        this.notificationService.error(
          'Expense not recorded',
          response.error || 'Could not record expense.',
        );
        return;
      }

      this.notificationService.success(
        'Expense recorded',
        'The expense was added to the ledger.',
      );
      this.expenseForm.reset({
        expense_date: localDate(new Date()),
        category: '',
        description: '',
        amount: null,
        payment_method: 'cash',
        reference: '',
        notes: '',
      });
      await this.loadExpenses();
    } catch {
      this.notificationService.error(
        'Expense not recorded',
        'Could not record expense.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
