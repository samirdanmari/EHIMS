import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CompanyProfileComponent } from './company-profile/company-profile.component';
import { PrinterConfigComponent } from './printer-config/printer-config.component';
import { BackupComponent } from './backup/backup.component';

type Tab = 'company' | 'printer' | 'backup';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CompanyProfileComponent,
    PrinterConfigComponent,
    BackupComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">System Settings</h2>
          <p class="page-subtitle">
            Configure company profile, printer, and system preferences
          </p>
        </div>
      </div>

      <div class="page-content">
        <!-- Settings Tabs -->
        <div class="tabs-container">
          <div class="tabs-header">
            <button
              class="tab-button"
              [class.active]="activeTab() === 'company'"
              (click)="setTab('company')"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Company Profile
            </button>

            <button
              class="tab-button"
              [class.active]="activeTab() === 'printer'"
              (click)="setTab('printer')"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path
                  d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Printer Configuration
            </button>

            <button
              class="tab-button"
              [class.active]="activeTab() === 'backup'"
              (click)="setTab('backup')"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Backup & Restore
            </button>
          </div>

          <div class="tabs-content">
            @if (activeTab() === 'company') {
              <app-company-profile></app-company-profile>
            }

            @if (activeTab() === 'printer') {
              <app-printer-config></app-printer-config>
            }

            @if (activeTab() === 'backup') {
              <app-backup></app-backup>
            }
          </div>
        </div>
      </div>
    </div>
  `,

  styles: [
    `
      .tabs-container {
        background: #0f172a;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(2, 6, 23, 0.4);
      }

      .tabs-header {
        display: flex;
        gap: 0;
        border-bottom: 2px solid rgba(148, 163, 184, 0.18);
        background: #0b1220;
      }

      .tab-button {
        flex: 1;
        padding: 1rem;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        color: #dbe4ff;
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;

        &:hover:not(:disabled) {
          color: #f8fafc;
          background: rgba(59, 130, 246, 0.08);
        }

        &.active {
          color: #7dd3fc;
          border-bottom-color: #7dd3fc;
          background: rgba(125, 211, 252, 0.06);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        svg {
          width: 18px;
          height: 18px;
        }
      }

      .tabs-content {
        padding: 1.5rem;
        background: #0f172a;
      }

      .tab-pane {
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class SettingsComponent {
  private router = inject(Router);

  activeTab = signal<Tab>('company');

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }
}
