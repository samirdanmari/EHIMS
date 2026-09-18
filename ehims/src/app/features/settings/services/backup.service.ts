import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';
import { BackupInfo, BackupResponse } from '../../../core/models/settings.model';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private electronService = inject(ElectronService);

  /** Returns DB path, file size, and last-modified date. */
  async getBackupInfo(): Promise<BackupResponse> {
    return this.electronService.invoke<BackupResponse>('backup:get-info');
  }

  /** Opens a native Save dialog and copies the DB to the chosen location. */
  async createLocalBackup(): Promise<BackupResponse> {
    return this.electronService.invoke<BackupResponse>('backup:create-local');
  }

  /** Opens a native Open dialog, validates the file, and restores it as the live DB. */
  async restoreLocalBackup(): Promise<BackupResponse> {
    return this.electronService.invoke<BackupResponse>('backup:restore-local');
  }
}
