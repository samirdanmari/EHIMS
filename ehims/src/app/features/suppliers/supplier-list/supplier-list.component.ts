import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="coming-soon-page">
      <div class="coming-soon-content animate-fadeInUp">
        <div class="module-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <h2>Supplier Accounts Payable</h2>
        <p>The Suppliers module arrives in Phase 4. Manage supplier profiles, credit ledgers, payment disbursements, and full transaction history.</p>
        <div class="feature-list">
          <div class="feature-item">👥 Supplier Directory</div>
          <div class="feature-item">📋 Credit Ledger Integration</div>
          <div class="feature-item">💰 Payment Processing</div>
          <div class="feature-item">📜 Transaction History</div>
        </div>
        <a routerLink="/dashboard" class="btn btn-primary">← Back to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .coming-soon-page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .coming-soon-content { text-align: center; max-width: 500px; }
    .module-icon { width: 96px; height: 96px; background: rgba(139,92,246,0.12); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #8b5cf6; animation: pulse 3s ease-in-out infinite; }
    h2 { font-size: 1.5rem; color: #f0f1f5; margin-bottom: 0.75rem; font-family: 'Outfit', sans-serif; }
    p { color: #a0a4b8; line-height: 1.6; margin-bottom: 1.5rem; }
    .feature-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem; }
    .feature-item { background: rgba(34,38,57,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.625rem 1rem; color: #a0a4b8; font-size: 0.875rem; text-align: left; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: all 0.2s; }
    .btn-primary:hover { background: #7c3aed; transform: translateY(-1px); }
  `]
})
export class SupplierListComponent {}
