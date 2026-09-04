import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';

interface NavTab {
  label: string;
  route: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-eod-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  template: `
    <div class="eod-container">
      <div class="eod-header">
        <div class="header-content">
          <h1>End of Day Management</h1>
          <p class="subtitle">Manage shifts, reconciliation, and reporting</p>
        </div>
      </div>

      <div class="eod-tabs">
        <nav class="tab-navigation">
          @for (tab of navTabs; track tab.route) {
            <a
              [routerLink]="tab.route"
              routerLinkActive="active"
              class="tab-item"
              [title]="tab.description"
            >
              <div class="tab-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path [attr.d]="tab.icon"></path>
                </svg>
              </div>
              <div class="tab-label">{{ tab.label }}</div>
            </a>
          }
        </nav>
      </div>

      <div class="eod-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [
    `
      .eod-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #0f1117;
      }

      .eod-header {
        padding: 32px 24px 24px;
        border-bottom: 1px solid #222430;
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.05) 0%,
          transparent 100%
        );
      }

      .eod-header h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 600;
        color: #f0f1f5;
        font-family: 'Outfit', sans-serif;
      }

      .eod-header .subtitle {
        margin: 0;
        color: #a0a4b8;
        font-size: 14px;
      }

      .eod-tabs {
        padding: 0;
        border-bottom: 1px solid #222430;
        background: #151b28;
      }

      .tab-navigation {
        display: flex;
        gap: 0;
        padding: 0;
        margin: 0;
        list-style: none;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
      }

      .tab-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 24px;
        color: #a0a4b8;
        text-decoration: none;
        border-bottom: 3px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .tab-item:hover {
        color: #f0f1f5;
        background: rgba(59, 130, 246, 0.05);
      }

      .tab-item.active {
        color: #3b82f6;
        border-bottom-color: #3b82f6;
        background: rgba(59, 130, 246, 0.08);
      }

      .tab-icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tab-icon svg {
        width: 100%;
        height: 100%;
      }

      .tab-label {
        font-size: 13px;
        font-weight: 500;
      }

      .eod-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        background: #0f1117;
      }

      @media (max-width: 768px) {
        .eod-header {
          padding: 20px 16px 16px;
        }

        .eod-header h1 {
          font-size: 20px;
        }

        .eod-header .subtitle {
          font-size: 12px;
        }

        .tab-item {
          padding: 12px 16px;
          gap: 6px;
        }

        .tab-label {
          font-size: 12px;
        }
      }
    `,
  ],
})
export class EodLayoutComponent {
  navTabs: NavTab[] = [
    {
      label: 'Open Shift',
      route: '/eod/open-shift',
      icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
      description: 'Start a new shift and set opening cash',
    },
    {
      label: 'Close Shift',
      route: '/eod/close-shift',
      icon: 'M12 20v-6m0 0V4m0 10l-3-3m3 3l3-3',
      description: 'End shift and reconcile cash',
    },
    {
      label: 'Shift Reports',
      route: '/eod/reports',
      icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z',
      description: 'View all closed shifts and generate reports',
    },
  ];
}
