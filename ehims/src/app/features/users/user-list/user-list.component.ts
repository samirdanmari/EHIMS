import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { UsersService } from '../services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

interface UserRole {
  name: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  isLoading = signal(true);
  isSaving = signal(false);
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  roles = signal<UserRole[]>([]);

  searchTerm = signal('');
  isModalOpen = signal(false);
  editingUser = signal<User | null>(null);
  currentUserId = signal<number | null>(null);

  form = new FormGroup({
    username: new FormControl('', {
      validators: [Validators.required, Validators.minLength(3)],
      nonNullable: true,
    }),
    display_name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    password: new FormControl(''),
    role: new FormControl<any>('cashier', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  async ngOnInit() {
    const currentUser = this.authService.currentUser();
    this.currentUserId.set(currentUser?.id || null);

    // Load roles first so they're available when modal opens
    await this.loadRoles();
    await this.loadUsers();
    this.isLoading.set(false);
  }

  async loadUsers() {
    const res = await this.usersService.listUsers({ includeInactive: true });
    if (res.success) {
      this.users.set(res.users);
      this.applySearch();
    }
  }

  async loadRoles() {
    const res = await this.usersService.listRoles();
    if (res.success && res.roles.length > 0) {
      this.roles.set(res.roles);
    } else {
      // Fallback roles if service fails
      this.roles.set([
        {
          name: 'admin',
          label: 'Administrator',
          description: 'Full system access',
        },
        {
          name: 'manager',
          label: 'Manager',
          description: 'Manage inventory, suppliers, users',
        },
        {
          name: 'storekeeper',
          label: 'Store Keeper',
          description: 'Manage inventory and stock',
        },
        {
          name: 'cashier',
          label: 'Cashier',
          description: 'Process orders and payments',
        },
        {
          name: 'waiter',
          label: 'Waiter',
          description: 'View menu and place orders',
        },
      ]);
    }
  }

  applySearch() {
    const search = this.searchTerm().toLowerCase();
    this.filteredUsers.set(
      this.users().filter(
        (u) =>
          u.username.toLowerCase().includes(search) ||
          u.display_name.toLowerCase().includes(search),
      ),
    );
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.applySearch();
  }

  openCreateModal() {
    this.editingUser.set(null);
    this.form.reset({
      username: '',
      display_name: '',
      password: '',
      role: 'cashier',
    });
    this.form
      .get('password')
      ?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.isModalOpen.set(true);
  }

  openEditModal(user: User) {
    this.editingUser.set(user);
    this.form.reset({
      username: user.username,
      display_name: user.display_name,
      password: '',
      role: user.role,
    });
    this.form.get('password')?.clearAsyncValidators();
    this.form.get('password')?.setValidators([]);
    this.form.get('password')?.updateValueAndValidity();
    this.form.get('username')?.disable();
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.form.get('username')?.enable();
  }

  async onSubmit() {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      const editing = this.editingUser();

      if (editing) {
        const res = await this.usersService.updateUser(editing.id, {
          display_name: value.display_name,
          role: value.role as any,
        });
        if (res.success) {
          this.notificationService.success(
            'User updated',
            `${value.display_name} has been updated.`,
          );
          this.closeModal();
          await this.loadUsers();
        } else {
          this.notificationService.error(
            'Update failed',
            res.error || 'Could not update',
          );
        }
      } else {
        if (!value.password) {
          this.notificationService.error(
            'Password required',
            'Please enter a password for the new user',
          );
          this.isSaving.set(false);
          return;
        }
        const res = await this.usersService.createUser({
          username: value.username,
          display_name: value.display_name,
          password: value.password,
          role: value.role as any,
        });
        if (res.success) {
          this.notificationService.success(
            'User created',
            `${value.display_name} has been added.`,
          );
          this.closeModal();
          await this.loadUsers();
        } else {
          this.notificationService.error(
            'Create failed',
            res.error || 'Could not create',
          );
        }
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDeactivate(user: User) {
    if (user.id === this.currentUserId()) {
      this.notificationService.error(
        'Cannot deactivate yourself',
        'You cannot deactivate your own account.',
      );
      return;
    }

    const confirmed = await this.confirmDialog.open({
      title: 'Deactivate user?',
      message: `"${user.display_name}" will be unable to log in.`,
      confirmText: 'Deactivate',
      type: 'danger',
    });
    if (!confirmed) return;

    const res = await this.usersService.deactivateUser(user.id);
    if (res.success) {
      this.notificationService.success('User deactivated', user.display_name);
      await this.loadUsers();
    } else {
      this.notificationService.error(
        'Action failed',
        res.error || 'Could not deactivate',
      );
    }
  }

  getRoleLabel(role: string): string {
    return this.roles().find((r) => r.name === role)?.label || role;
  }

  getRoleDescription(role: string): string {
    return this.roles().find((r) => r.name === role)?.description || '';
  }
}
