import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="coming-soon-page">
      <div class="coming-soon-content animate-fadeInUp">
        <div class="module-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h2>User Management & RBAC</h2>
        <p>The Users module is built in Phase 6. Full role-based access control, user provisioning, credential management, and access audit logs.</p>
        <div class="feature-list">
          <div class="feature-item">🔐 Role-Based Access Control</div>
          <div class="feature-item">👤 User Provisioning</div>
          <div class="feature-item">🔑 Credential Management</div>
          <div class="feature-item">📝 Access Audit Logs</div>
        </div>
        <a routerLink="/dashboard" class="btn btn-primary">← Back to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .coming-soon-page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .coming-soon-content { text-align: center; max-width: 500px; }
    .module-icon { width: 96px; height: 96px; background: rgba(244,63,94,0.12); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #f43f5e; animation: pulse 3s ease-in-out infinite; }
    h2 { font-size: 1.5rem; color: #f0f1f5; margin-bottom: 0.75rem; font-family: 'Outfit', sans-serif; }
    p { color: #a0a4b8; line-height: 1.6; margin-bottom: 1.5rem; }
    .feature-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem; }
    .feature-item { background: rgba(34,38,57,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.625rem 1rem; color: #a0a4b8; font-size: 0.875rem; text-align: left; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #f43f5e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: all 0.2s; }
    .btn-primary:hover { background: #e11d48; transform: translateY(-1px); }
  `]
})
export class UserListComponent {}
