import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { UserRole } from '../models/user.model';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  const allowedRoles = route.data['roles'] as UserRole[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (authService.hasRole(allowedRoles)) {
    return true;
  }

  notificationService.error('Unauthorized', 'You do not have permission to access this page.');
  return router.createUrlTree(['/dashboard']);
};
