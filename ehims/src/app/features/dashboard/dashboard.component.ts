import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ElectronService } from '../../core/services/electron.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, StatCardComponent, CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private electronService = inject(ElectronService);

  isLoading = signal(true);
  todaySales = signal(0);
  activeOrders = signal(0);
  lowStockCount = signal(0);
  totalMenuItems = signal(0);
  recentOrders = signal<any[]>([]);

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    this.isLoading.set(true);
    try {
      const [sales, activeOrds, lowStock, menuItems, recent] = await Promise.all([
        this.electronService.invoke<any>('db:query', {
          sql: `SELECT COALESCE(SUM(total_amount), 0) as value FROM orders
                WHERE date(created_at) = date('now', 'localtime') AND status != 'voided'`
        }),
        this.electronService.invoke<any>('db:query', {
          sql: `SELECT COUNT(*) as value FROM orders WHERE status IN ('pending','confirmed','preparing')`
        }),
        this.electronService.invoke<any>('db:query', {
          sql: `SELECT COUNT(*) as value FROM inventory_items
                WHERE current_stock <= low_stock_threshold AND is_active = 1`
        }),
        this.electronService.invoke<any>('db:query', {
          sql: `SELECT COUNT(*) as value FROM menu_items WHERE is_available = 1`
        }),
        this.electronService.invoke<any>('db:query', {
          sql: `SELECT o.*, u.display_name as cashier_name FROM orders o
                LEFT JOIN users u ON o.cashier_id = u.id
                ORDER BY o.created_at DESC LIMIT 8`
        }),
      ]);

      this.todaySales.set(sales?.rows?.[0]?.value ?? 0);
      this.activeOrders.set(activeOrds?.rows?.[0]?.value ?? 0);
      this.lowStockCount.set(lowStock?.rows?.[0]?.value ?? 0);
      this.totalMenuItems.set(menuItems?.rows?.[0]?.value ?? 0);
      this.recentOrders.set(recent?.rows ?? []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      preparing: 'badge-primary',
      served: 'badge-success',
      completed: 'badge-success',
      voided: 'badge-danger',
    };
    return map[status] || 'badge-neutral';
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
