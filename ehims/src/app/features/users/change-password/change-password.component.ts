import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
})
export class ChangePasswordComponent {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  isProcessing = signal(false);
  showPassword = signal(false);

  form = new FormGroup({
    old_password: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    new_password: new FormControl('', {
      validators: [Validators.required, Validators.minLength(6)],
      nonNullable: true,
    }),
    confirm_password: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  getPasswordLength(): number {
    return this.form.get('new_password')?.value?.length || 0;
  }

  passwordsMatch(): boolean {
    const np = this.form.get('new_password')?.value || '';
    const cp = this.form.get('confirm_password')?.value || '';
    return np === cp && np.length > 0;
  }

  async onSubmit() {
    if (this.form.invalid || this.isProcessing()) return;

    const { old_password, new_password, confirm_password } =
      this.form.getRawValue();

    if (new_password !== confirm_password) {
      this.notificationService.error(
        'Passwords do not match',
        'New password and confirm password must match.',
      );
      return;
    }

    this.isProcessing.set(true);
    try {
      const userId = this.authService.currentUser()?.id;
      if (!userId) {
        this.notificationService.error(
          'Not signed in',
          'Could not identify current user.',
        );
        return;
      }

      const res = await this.usersService.changePassword({
        user_id: userId,
        old_password,
        new_password,
      });

      if (res.success) {
        this.notificationService.success(
          'Password changed',
          'Your password has been updated successfully.',
        );
        this.form.reset();
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      } else {
        this.notificationService.error(
          'Change failed',
          res.error || 'Could not change password',
        );
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
}
