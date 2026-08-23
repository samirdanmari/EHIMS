import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './core/services/notification.service';
import { NotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationToastComponent],
  template: `
    <router-outlet />
    <app-notification-toast />
  `,
  styles: [':host { display: block; height: 100%; }']
})
export class AppComponent {
  // NotificationService injected to ensure it initializes app-wide
  private _notificationService = inject(NotificationService);
}
