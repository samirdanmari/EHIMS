import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-eod-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="coming-soon-page">
      <div class="coming-soon-content animate-fadeInUp">
        <div class="module-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <h2>EOD Financial Engine</h2>
        <p>The EOD module launches in Phase 5. Automated end-of-day reconciliation, COGS calculations, P&amp;L reporting, and shift handover management.</p>
        <div class="feature-list">
          <div class="feature-item">📊 EOD Reconciliation</div>
          <div class="feature-item">💹 COGS & Profit Calculation</div>
          <div class="feature-item">🔄 Shift Handover Reports</div>
          <div class="feature-item">📅 Historical Reports</div>
        </div>
        <a routerLink="/dashboard" class="btn btn-primary">← Back to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .coming-soon-page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .coming-soon-content { text-align: center; max-width: 500px; }
    .module-icon { width: 96px; height: 96px; background: rgba(245,158,11,0.12); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #f59e0b; animation: pulse 3s ease-in-out infinite; }
    h2 { font-size: 1.5rem; color: #f0f1f5; margin-bottom: 0.75rem; font-family: 'Outfit', sans-serif; }
    p { color: #a0a4b8; line-height: 1.6; margin-bottom: 1.5rem; }
    .feature-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem; }
    .feature-item { background: rgba(34,38,57,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.625rem 1rem; color: #a0a4b8; font-size: 0.875rem; text-align: left; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #f59e0b; color: #0f1117; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: all 0.2s; }
    .btn-primary:hover { background: #d97706; transform: translateY(-1px); }
  `]
})
export class EodDashboardComponent {}
