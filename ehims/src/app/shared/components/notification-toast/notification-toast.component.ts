import { Component, inject, computed } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (notification of notifications(); track notification.id) {
        <div
          class="toast toast-{{ notification.type }}"
          [class.dismissing]="notification.dismissing"
        >
          <div class="toast-icon">
            @switch (notification.type) {
              @case ('success') {
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  style="color: #10b981"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
              @case ('error') {
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  style="color: #f43f5e"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              }
              @case ('warning') {
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  style="color: #f59e0b"
                >
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
              @default {
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  style="color: #06b6d4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              }
            }
          </div>
          <div class="toast-content">
            <div class="toast-title">{{ notification.title }}</div>
            @if (notification.message) {
              <div class="toast-message">{{ notification.message }}</div>
            }
          </div>
          <button class="toast-close" (click)="dismiss(notification.id)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styleUrls: ['./notification-toast.component.scss'],
})
export class NotificationToastComponent {
  private notificationService = inject(NotificationService);
  notifications = this.notificationService.notifications;

  dismiss(id: string) {
    this.notificationService.dismiss(id);
  }
}
