import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  isOpen = signal(false);
  
  config = signal<ConfirmConfig>({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'info'
  });

  private resolvePromise?: (value: boolean) => void;

  open(config: Partial<ConfirmConfig>): Promise<boolean> {
    this.config.update(current => ({ ...current, ...config }));
    this.isOpen.set(true);

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  confirm() {
    this.isOpen.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(true);
      this.resolvePromise = undefined;
    }
  }

  cancel() {
    this.isOpen.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(false);
      this.resolvePromise = undefined;
    }
  }
}
