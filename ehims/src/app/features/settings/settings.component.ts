import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CompanyProfileComponent } from './company-profile/company-profile.component';
import { PrinterConfigComponent } from './printer-config/printer-config.component';
import { BackupComponent } from './backup/backup.component';
import { UpdateService } from '../../core/services/update.service';

type Tab = 'company' | 'printer' | 'backup' | 'system';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
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

            <button
              class="tab-button"
              [class.active]="activeTab() === 'system'"
              (click)="setTab('system')"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.77.55l-.05.07h-3.4l-.04-.08a1.7 1.7 0 0 0-1.55-1.02h-.1l-2.94-1.7.02-.08a1.7 1.7 0 0 0-.55-1.77l-.07-.05v-3.4l.08-.04a1.7 1.7 0 0 0 1.02-1.55v-.1l1.7-2.94.08.02a1.7 1.7 0 0 0 1.77-.55l.05-.07h3.4l.04.08a1.7 1.7 0 0 0 1.55 1.02h.1l2.94 1.7-.02.08a1.7 1.7 0 0 0 .55 1.77l.07.05v3.4l-.08.04a1.7 1.7 0 0 0-.82.76Z"
                />
              </svg>
              System &amp; Updates
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

            @if (activeTab() === 'system') {
              <section class="update-panel">
                <div class="update-heading">
                  <div>
                    <h3>Application updates</h3>
                    <p>Check the published release for a newer version.</p>
                  </div>
                  <button
                    class="update-search-button"
                    type="button"
                    (click)="searchForUpdates()"
                    [disabled]="isCheckingUpdates()"
                  >
                    @if (isCheckingUpdates()) {
                      <span class="spinner" aria-hidden="true"></span>
                    } @else {
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-4-4" />
                      </svg>
                    }
                    {{
                      isCheckingUpdates() ? 'Checking...' : 'Search for updates'
                    }}
                  </button>
                </div>

                @if (updateCheckMessage()) {
                  <p class="update-status" role="status">
                    {{ updateCheckMessage() }}
                  </p>
                }

                @if (
                  updateService.updateAvailable() && updateService.updateInfo();
                  as update
                ) {
                  <div class="release-details">
                    <div class="release-version">
                      <span>Installed v{{ update.currentVersion }}</span>
                      <span class="version-arrow" aria-hidden="true"
                        >&#8594;</span
                      >
                      <strong>Available v{{ update.latestVersion }}</strong>
                    </div>
                    @if (update.releaseNotes) {
                      <p class="release-notes">{{ update.releaseNotes }}</p>
                    }
                    @if (
                      updateService.updateStatus().status === 'downloading'
                    ) {
                      <p class="update-status" role="status">
                        Downloading update:
                        {{ updateService.updateStatus().percent ?? 0 }}%
                      </p>
                    }
                    @if (updateService.updateStatus().status === 'downloaded') {
                      <button
                        class="update-search-button"
                        type="button"
                        (click)="installUpdate()"
                      >
                        Install and restart
                      </button>
                    }
                    @if (
                      updateService.updateStatus().status === 'manual' ||
                      updateService.updateStatus().status === 'error'
                    ) {
                      <p class="update-status" role="status">
                        Automatic installation is unavailable for this release.
                        Download the Windows installer from GitHub.
                      </p>
                    }
                    <button
                      class="release-link"
                      type="button"
                      (click)="openRelease()"
                    >
                      Open release page
                    </button>
                  </div>
                }

                <p class="update-footnote">
                  Windows updates download in the background when the release
                  includes installer update files. You can also open the GitHub
                  release page to download the installer manually.
                </p>
              </section>
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

      .update-panel {
        max-width: 760px;
        color: #dbe4ff;
      }

      .update-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .update-heading h3 {
        margin: 0;
        color: #f8fafc;
        font-size: 1.125rem;
      }

      .update-heading p,
      .update-footnote {
        margin: 0.4rem 0 0;
        color: #a8b4ca;
        font-size: 0.875rem;
      }

      .update-search-button,
      .release-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        min-height: 40px;
        padding: 0.55rem 0.85rem;
        border: 1px solid #38bdf8;
        border-radius: 6px;
        background: #0c4a6e;
        color: #f0f9ff;
        font: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
      }

      .update-search-button:hover:not(:disabled),
      .release-link:hover {
        background: #075985;
      }

      .update-search-button:disabled {
        opacity: 0.65;
        cursor: wait;
      }

      .update-search-button svg {
        width: 17px;
        height: 17px;
      }

      .spinner {
        width: 15px;
        height: 15px;
        border: 2px solid rgba(240, 249, 255, 0.4);
        border-top-color: #f0f9ff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      .update-status {
        margin: 1.25rem 0 0;
        padding: 0.75rem 0;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
        color: #cbd5e1;
        font-size: 0.9rem;
      }

      .release-details {
        margin-top: 1rem;
        padding: 1rem 0;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      }

      .release-version {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.55rem;
        font-size: 0.9rem;
      }

      .release-version strong {
        color: #7dd3fc;
      }

      .version-arrow {
        color: #94a3b8;
      }

      .release-notes {
        max-height: 180px;
        overflow: auto;
        margin: 0.85rem 0;
        color: #cbd5e1;
        font-size: 0.875rem;
        white-space: pre-wrap;
      }

      .release-link {
        min-height: 36px;
        border-color: rgba(148, 163, 184, 0.35);
        background: transparent;
        cursor: pointer;
      }

      .update-footnote {
        margin-top: 1rem;
        line-height: 1.5;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 700px) {
        .tabs-header {
          flex-wrap: wrap;
        }

        .tab-button {
          flex: 1 1 50%;
        }

        .update-heading {
          align-items: flex-start;
          flex-direction: column;
        }
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
  updateService = inject(UpdateService);

  activeTab = signal<Tab>('company');
  isCheckingUpdates = signal(false);
  updateCheckMessage = signal('');

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  async searchForUpdates() {
    if (this.isCheckingUpdates()) return;
    this.isCheckingUpdates.set(true);
    this.updateCheckMessage.set('');

    try {
      const update = await this.updateService.checkForUpdates();
      this.updateCheckMessage.set(
        update
          ? `Version ${update.latestVersion} is available. Preparing the update...`
          : 'No newer release was returned. Check your internet connection and confirm a GitHub release has been published.',
      );
    } catch {
      this.updateCheckMessage.set(
        'Could not check for updates. Check your internet connection and try again.',
      );
    } finally {
      this.isCheckingUpdates.set(false);
    }
  }

  openRelease() {
    void this.updateService.openRelease();
  }

  installUpdate() {
    void this.updateService.installUpdate();
  }
}
