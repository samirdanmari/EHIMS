import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="coming-soon-page">
      <div class="coming-soon-content animate-fadeInUp">
        <div class="module-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <h2>Inventory & Stock Control</h2>
        <p>This module is being built in Phase 2. It will include item purchases tracking, shift-based stock issuance, real-time stock auditing, and low-stock alerts.</p>
        <div class="feature-list">
          <div class="feature-item">📦 Item Purchases Tracking</div>
          <div class="feature-item">🔄 Shift-Based Stock Issuance</div>
          <div class="feature-item">📊 Real-Time Stock Auditing</div>
          <div class="feature-item">🚨 Low-Stock Threshold Alerts</div>
        </div>
        <a routerLink="/dashboard" class="btn btn-primary">← Back to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/variables' as *;
    .coming-soon-page {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .coming-soon-content {
      text-align: center;
      max-width: 500px;
    }
    .module-icon {
      width: 96px;
      height: 96px;
      background: rgba(59,130,246,0.12);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      color: #3b82f6;
      animation: pulse 3s ease-in-out infinite;
    }
    h2 { font-size: 1.5rem; color: #f0f1f5; margin-bottom: 0.75rem; font-family: 'Outfit', sans-serif; }
    p { color: #a0a4b8; line-height: 1.6; margin-bottom: 1.5rem; }
    .feature-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem; }
    .feature-item { background: rgba(34,38,57,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.625rem 1rem; color: #a0a4b8; font-size: 0.875rem; text-align: left; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: all 0.2s; }
    .btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
  `]
})
export class InventoryListComponent {}
