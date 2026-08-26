import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  dismissing?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  public notifications = signal<Notification[]>([]);

  private add(notification: Omit<Notification, 'id'>) {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = { ...notification, id };

    this.notifications.update((current) => [...current, newNotification]);

    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(title: string, message: string, duration?: number) {
    this.add({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration?: number) {
    this.add({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration?: number) {
    this.add({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration?: number) {
    this.add({ type: 'info', title, message, duration });
  }

  dismiss(id: string) {
    this.notifications.update((current) => current.filter((n) => n.id !== id));
  }
}
