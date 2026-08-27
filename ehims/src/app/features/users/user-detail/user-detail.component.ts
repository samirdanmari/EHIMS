import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

interface UserRole {
  name: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
})
export class UserDetailComponent implements OnInit {
  private usersService = inject(UsersService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isSaving = signal(false);
  isResettingPassword = signal(false);
  user = signal<User | null>(null);
  roles = signal<UserRole[]>([]);
  activity = signal<any[]>([]);

  form = new FormGroup({
    display_name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    role: new FormControl<any>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  resetPasswordForm = new FormGroup({
    new_password: new FormControl('', {
      validators: [Validators.required, Validators.minLength(6)],
      nonNullable: true,
    }),
  });

  async ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.router.navigate(['/users']);
      return;
    }

    await this.loadUser(parseInt(userId, 10));
    await this.loadRoles();
    await this.loadActivity(parseInt(userId, 10));
    this.isLoading.set(false);
  }

  async loadUser(userId: number) {
    const res = await this.usersService.getUser(userId);
    if (res.success && res.user) {
      this.user.set(res.user);
      this.form.patchValue({
        display_name: res.user.display_name,
        role: res.user.role,
      });
    } else {
      this.notificationService.error(
        'User not found',
        'Could not load user details',
      );
      this.router.navigate(['/users']);
    }
  }

  async loadRoles() {
    const res = await this.usersService.listRoles();
    if (res.success) {
      this.roles.set(res.roles);
    }
  }

  async loadActivity(userId: number) {
    const res = await this.usersService.getUserActivity(userId, 20);
    if (res.success) {
      this.activity.set(res.activity);
    }
  }

  async onSubmit() {
    if (this.form.invalid || this.isSaving()) return;

    const user = this.user();
    if (!user) return;

    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      const res = await this.usersService.updateUser(user.id, {
        display_name: value.display_name,
        role: value.role as any,
      });

      if (res.success) {
        this.notificationService.success(
          'User updated',
          'Changes have been saved',
        );
        await this.loadUser(user.id);
      } else {
        this.notificationService.error(
          'Update failed',
          res.error || 'Could not update',
        );
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  async onResetPassword() {
    if (this.resetPasswordForm.invalid || this.isResettingPassword()) return;

    const user = this.user();
    if (!user) return;

    const confirmed = await this.confirmDialog.open({
      title: 'Reset password?',
      message: `This will set ${user.display_name}'s password to the one specified.`,
      confirmText: 'Reset Password',
      type: 'warning',
    });

    if (!confirmed) return;

    this.isResettingPassword.set(true);
    try {
      const password = this.resetPasswordForm.get('new_password')?.value;
      if (!password) {
        this.notificationService.error(
          'Password required',
          'Please enter a new password',
        );
        this.isResettingPassword.set(false);
        return;
      }
      const res = await this.usersService.resetPassword({
        user_id: user.id,
        new_password: password,
      });

      if (res.success) {
        this.notificationService.success(
          'Password reset',
          `${user.display_name}'s password has been reset`,
        );
        this.resetPasswordForm.reset();
      } else {
        this.notificationService.error(
          'Reset failed',
          res.error || 'Could not reset password',
        );
      }
    } finally {
      this.isResettingPassword.set(false);
    }
  }

  getRoleDescription(role: string): string {
    return this.roles().find((r) => r.name === role)?.description || '';
  }

  goBack() {
    this.router.navigate(['/users']);
  }
}
