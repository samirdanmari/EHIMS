import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="coming-soon-page">
      <div class="coming-soon-content animate-fadeInUp">
        <div class="module-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <h2>System Settings</h2>
        <p>The Settings module is built in Phase 6. Configure business profile, receipt layout, thermal printer, tax rates, and cloud synchronization.</p>
        <div class="feature-list">
          <div class="feature-item">🏢 Business Profile</div>
          <div class="feature-item">🖨️ Printer Configuration</div>
          <div class="feature-item">☁️ Cloud Sync (Firebase)</div>
          <div class="feature-item">💾 Database Backup</div>
        </div>
        <a routerLink="/dashboard" class="btn btn-primary">← Back to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .coming-soon-page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .coming-soon-content { text-align: center; max-width: 500px; }
    .module-icon { width: 96px; height: 96px; background: rgba(6,182,212,0.12); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #06b6d4; animation: pulse 3s ease-in-out infinite; }
    h2 { font-size: 1.5rem; color: #f0f1f5; margin-bottom: 0.75rem; font-family: 'Outfit', sans-serif; }
    p { color: #a0a4b8; line-height: 1.6; margin-bottom: 1.5rem; }
    .feature-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem; }
    .feature-item { background: rgba(34,38,57,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.625rem 1rem; color: #a0a4b8; font-size: 0.875rem; text-align: left; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #06b6d4; color: #0f1117; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: all 0.2s; }
    .btn-primary:hover { background: #0891b2; transform: translateY(-1px); }
  `]
})
export class SettingsComponent {}
