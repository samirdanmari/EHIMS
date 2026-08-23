import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-terminal',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="coming-soon-page">
      <div class="coming-soon-content animate-fadeInUp">
        <div class="module-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h2>Point of Sale Terminal</h2>
        <p>The POS module is coming in Phase 3. It will feature an intuitive order interface, kitchen ticket printing, receipt generation, and manager override controls.</p>
        <div class="feature-list">
          <div class="feature-item">🛒 Intuitive Order Processing</div>
          <div class="feature-item">🖨️ Kitchen & Receipt Printing</div>
          <div class="feature-item">🔐 Manager PIN Overrides</div>
          <div class="feature-item">💳 Multiple Payment Methods</div>
        </div>
        <a routerLink="/dashboard" class="btn btn-primary">← Back to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .coming-soon-page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .coming-soon-content { text-align: center; max-width: 500px; }
    .module-icon { width: 96px; height: 96px; background: rgba(16,185,129,0.12); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #10b981; animation: pulse 3s ease-in-out infinite; }
    h2 { font-size: 1.5rem; color: #f0f1f5; margin-bottom: 0.75rem; font-family: 'Outfit', sans-serif; }
    p { color: #a0a4b8; line-height: 1.6; margin-bottom: 1.5rem; }
    .feature-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem; }
    .feature-item { background: rgba(34,38,57,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.625rem 1rem; color: #a0a4b8; font-size: 0.875rem; text-align: left; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: all 0.2s; }
    .btn-primary:hover { background: #059669; transform: translateY(-1px); }
  `]
})
export class OrderTerminalComponent {}
