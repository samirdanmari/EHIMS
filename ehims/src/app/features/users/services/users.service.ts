import { Injectable, inject } from '@angular/core';
import { ElectronService } from '../../../core/services/electron.service';
import {
  User,
  UserCreateInput,
  UserUpdateInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from '../../../core/models/user.model';

interface UserRole {
  name: string;
  label: string;
  description: string;
}

interface ListUsersResponse {
  success: boolean;
  users: User[];
  error?: string;
}
interface UserResponse {
  success: boolean;
  user?: User;
  error?: string;
}
interface DeleteResponse {
  success: boolean;
  error?: string;
}
interface RolesResponse {
  success: boolean;
  roles: UserRole[];
  error?: string;
}
interface ActivityResponse {
  success: boolean;
  activity: any[];
  error?: string;
}
interface PasswordResponse {
  success: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private electronService = inject(ElectronService);

  listUsers(
    params: { search?: string; includeInactive?: boolean } = {},
  ): Promise<ListUsersResponse> {
    return this.electronService.invoke<ListUsersResponse>('users:list', params);
  }

  getUser(id: number): Promise<UserResponse> {
    return this.electronService.invoke<UserResponse>('users:get', { id });
  }

  createUser(payload: UserCreateInput): Promise<UserResponse> {
    return this.electronService.invoke<UserResponse>('users:create', payload);
  }

  updateUser(id: number, payload: UserUpdateInput): Promise<UserResponse> {
    return this.electronService.invoke<UserResponse>('users:update', {
      id,
      ...payload,
    });
  }

  changePassword(payload: ChangePasswordInput): Promise<PasswordResponse> {
    return this.electronService.invoke<PasswordResponse>(
      'users:change-password',
      payload,
    );
  }

  resetPassword(payload: ResetPasswordInput): Promise<PasswordResponse> {
    return this.electronService.invoke<PasswordResponse>(
      'users:reset-password',
      payload,
    );
  }

  deactivateUser(id: number): Promise<DeleteResponse> {
    return this.electronService.invoke<DeleteResponse>('users:deactivate', {
      id,
    });
  }

  listRoles(): Promise<RolesResponse> {
    return this.electronService.invoke<RolesResponse>('roles:list');
  }

  getUserActivity(userId: number, limit = 50): Promise<ActivityResponse> {
    return this.electronService.invoke<ActivityResponse>('users:get-activity', {
      user_id: userId,
      limit,
    });
  }
}
