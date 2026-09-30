import { Injectable, inject, signal } from '@angular/core';
import { ElectronService } from './electron.service';
import { NotificationService } from './notification.service';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private electronService = inject(ElectronService);
  private notificationService = inject(NotificationService);

  /** True once a newer version has been detected. */
  updateAvailable = signal(false);

  /** Details of the latest available release. */
  updateInfo = signal<UpdateInfo | null>(null);
  updateStatus = signal<{
    status: string;
    percent?: number;
    version?: string;
    message?: string;
  }>({ status: 'idle' });

  constructor() {
    this.listenForUpdates();
  }

  /**
   * Subscribe to the `update:available` push event emitted by the main process.
   * This fires automatically on startup and every hour if an update is found.
   */
  private listenForUpdates(): void {
    if (!this.electronService.isElectron) return;

    this.electronService.on('update:available', (info: UpdateInfo) => {
      this.updateAvailable.set(true);
      this.updateInfo.set(info);

      // Show a persistent notification toast (0 = no auto-dismiss)
      this.notificationService.info(
        '🚀 Update Available',
        `Version ${info.latestVersion} is ready — click the update button to get it.`,
        10000,
      );
    });

    this.electronService.on(
      'update:status',
      (status: {
        status: string;
        percent?: number;
        version?: string;
        message?: string;
      }) => {
        this.updateStatus.set(status);
      },
    );
  }

  /**
   * Manually trigger an update check from the UI.
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (!this.electronService.isElectron) return null;
    try {
      const info = await this.electronService.invoke<UpdateInfo | null>(
        'update:check',
      );
      if (info) {
        this.updateAvailable.set(true);
        this.updateInfo.set(info);
      }
      return info;
    } catch {
      return null;
    }
  }

  /**
   * Opens the GitHub release page in the default system browser.
   */
  async openRelease(): Promise<void> {
    const info = this.updateInfo();
    if (!info) return;
    await this.electronService.invoke('update:open-release', info.releaseUrl);
  }

  async installUpdate(): Promise<boolean> {
    if (!this.electronService.isElectron) return false;
    return this.electronService.invoke<boolean>('update:install');
  }
}
