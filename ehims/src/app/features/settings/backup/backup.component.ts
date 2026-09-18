import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackupService } from '../services/backup.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BackupInfo } from '../../../core/models/settings.model';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backup-container">

      <!-- Database Info Card -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-icon info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <div>
            <h3 class="section-title">Database Information</h3>
            <p class="section-desc">Current database file details</p>
          </div>
          <button class="refresh-btn" (click)="loadInfo()" [disabled]="isLoadingInfo()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 [class.spinning]="isLoadingInfo()">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>

        @if (isLoadingInfo()) {
          <div class="loading-row">
            <div class="spinner small"></div>
            <span>Loading database info…</span>
          </div>
        } @else if (dbInfo()) {
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Database Path</span>
              <span class="info-value path-value" [title]="dbInfo()!.dbPath">{{ dbInfo()!.dbPath }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">File Size</span>
              <span class="info-value">{{ formatBytes(dbInfo()!.fileSizeBytes) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Last Modified</span>
              <span class="info-value">{{ formatDate(dbInfo()!.lastModified) }}</span>
            </div>
          </div>
        } @else {
          <p class="empty-text">Could not load database information.</p>
        }
      </div>

      <!-- Create Backup Card -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-icon backup-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <h3 class="section-title">Create Local Backup</h3>
            <p class="section-desc">Save a copy of your database to your computer</p>
          </div>
        </div>

        <div class="action-body">
          <ul class="info-list">
            <li>A snapshot of all your data will be saved as a <code>.db</code> file</li>
            <li>Choose any folder on your computer to store the backup</li>
            <li>The filename will include the date and time automatically</li>
          </ul>

          <button class="btn btn-primary" (click)="createBackup()" [disabled]="isCreatingBackup()">
            @if (isCreatingBackup()) {
              <div class="spinner white"></div>
              Creating Backup…
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Create Backup
            }
          </button>
        </div>
      </div>

      <!-- Restore Backup Card -->
      <div class="section-card danger-card">
        <div class="section-header">
          <div class="section-icon restore-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
            </svg>
          </div>
          <div>
            <h3 class="section-title">Restore from Backup</h3>
            <p class="section-desc">Replace the current database with a backup file</p>
          </div>
        </div>

        <div class="action-body">
          <div class="warning-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <strong>Warning:</strong> Restoring a backup will <strong>replace all current data</strong>.
              This action cannot be undone. The application will reload after restore.
            </div>
          </div>

          <ul class="info-list">
            <li>Select a <code>.db</code> backup file previously created by this app</li>
            <li>All current records will be replaced with the backup data</li>
            <li>The app will reload automatically after a successful restore</li>
          </ul>

          @if (!showRestoreConfirm()) {
            <button class="btn btn-danger" (click)="showRestoreConfirm.set(true)" [disabled]="isRestoring()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
              Restore Backup
            </button>
          } @else {
            <div class="confirm-row">
              <span class="confirm-label">Are you sure you want to restore?</span>
              <div class="confirm-btns">
                <button class="btn btn-ghost" (click)="showRestoreConfirm.set(false)" [disabled]="isRestoring()">
                  Cancel
                </button>
                <button class="btn btn-danger" (click)="restoreBackup()" [disabled]="isRestoring()">
                  @if (isRestoring()) {
                    <div class="spinner white"></div>
                    Restoring…
                  } @else {
                    Yes, Restore
                  }
                </button>
              </div>
            </div>
          }
        </div>
      </div>

    </div>
  `,
  styles: [`
    .backup-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .section-card {
      background: #0b1220;
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 10px;
      padding: 1.5rem;
    }

    .danger-card {
      border-color: rgba(239, 68, 68, 0.25);
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      margin-bottom: 1.25rem;
    }

    .section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .info-icon   { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .backup-icon { background: rgba(34, 197, 94, 0.12);  color: #4ade80; }
    .restore-icon { background: rgba(239, 68, 68, 0.12); color: #f87171; }

    .section-title {
      margin: 0 0 0.2rem;
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .section-desc {
      margin: 0;
      font-size: 0.8125rem;
      color: #94a3b8;
    }

    .refresh-btn {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.8rem;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        border-color: #60a5fa;
        color: #60a5fa;
      }

      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinning { animation: spin 0.8s linear infinite; }

    .loading-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .spinner {
      border-radius: 50%;
      border-style: solid;
      animation: spin 0.7s linear infinite;

      &.small {
        width: 16px; height: 16px;
        border-width: 2px;
        border-color: rgba(148, 163, 184, 0.3);
        border-top-color: #94a3b8;
      }

      &.white {
        width: 16px; height: 16px;
        border-width: 2px;
        border-color: rgba(255,255,255,0.3);
        border-top-color: #fff;
      }
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .info-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-value {
      font-size: 0.875rem;
      color: #cbd5e1;

      &.path-value {
        font-family: 'Courier New', monospace;
        font-size: 0.8rem;
        word-break: break-all;
        color: #7dd3fc;
      }
    }

    .empty-text {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    .action-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .info-list {
      margin: 0;
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      li {
        font-size: 0.8125rem;
        color: #94a3b8;

        code {
          background: rgba(148, 163, 184, 0.12);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-size: 0.8rem;
          color: #7dd3fc;
        }
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      align-self: flex-start;

      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;

      &:hover:not(:disabled) { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
    }

    .btn-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;

      &:hover:not(:disabled) { background: linear-gradient(135deg, #f87171, #ef4444); }
    }

    .btn-ghost {
      background: rgba(148, 163, 184, 0.1);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.2);

      &:hover:not(:disabled) { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
    }

    .warning-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      font-size: 0.8125rem;
      color: #fca5a5;
      line-height: 1.5;

      svg { flex-shrink: 0; margin-top: 0.1rem; }

      strong { color: #f87171; }
    }

    .confirm-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .confirm-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #fca5a5;
    }

    .confirm-btns {
      display: flex;
      gap: 0.625rem;
    }
  `],
})
export class BackupComponent implements OnInit {
  private backupService = inject(BackupService);
  private notificationService = inject(NotificationService);

  dbInfo = signal<BackupInfo | null>(null);
  isLoadingInfo = signal(false);
  isCreatingBackup = signal(false);
  isRestoring = signal(false);
  showRestoreConfirm = signal(false);

  async ngOnInit() {
    await this.loadInfo();
  }

  async loadInfo() {
    this.isLoadingInfo.set(true);
    try {
      const res = await this.backupService.getBackupInfo();
      if (res.success && res.data) {
        this.dbInfo.set(res.data);
      } else {
        this.dbInfo.set(null);
      }
    } catch {
      this.dbInfo.set(null);
    }
    this.isLoadingInfo.set(false);
  }

  async createBackup() {
    this.isCreatingBackup.set(true);
    try {
      const res = await this.backupService.createLocalBackup();
      if (res.success) {
        this.notificationService.success(
          'Backup Created',
          `Database backup saved successfully`,
        );
        // Refresh info after backup
        await this.loadInfo();
      } else if (res.error && res.error !== 'Backup cancelled') {
        this.notificationService.error('Backup Failed', res.error);
      }
    } catch (err: any) {
      this.notificationService.error('Backup Failed', err?.message || 'Unknown error');
    }
    this.isCreatingBackup.set(false);
  }

  async restoreBackup() {
    this.isRestoring.set(true);
    this.showRestoreConfirm.set(false);
    try {
      const res = await this.backupService.restoreLocalBackup();
      if (res.success) {
        this.notificationService.success(
          'Restore Successful',
          'The database has been restored. The app will now reload…',
        );
        // Brief pause so the user sees the toast, then reload
        setTimeout(() => window.location.reload(), 2000);
      } else if (res.error && res.error !== 'Restore cancelled') {
        this.notificationService.error('Restore Failed', res.error);
        this.isRestoring.set(false);
      } else {
        // User cancelled the dialog
        this.isRestoring.set(false);
      }
    } catch (err: any) {
      this.notificationService.error('Restore Failed', err?.message || 'Unknown error');
      this.isRestoring.set(false);
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  formatDate(isoString: string): string {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  }
}
