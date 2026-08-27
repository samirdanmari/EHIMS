export type UserRole =
  | 'admin'
  | 'manager'
  | 'storekeeper'
  | 'cashier'
  | 'waiter';

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  session_id?: string;
  error?: string;
}

export interface UserInput {
  username: string;
  display_name: string;
  password: string;
  role: UserRole;
}

export interface UserCreateInput {
  username: string;
  display_name: string;
  password: string;
  role: UserRole;
}

export interface UserUpdateInput {
  display_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface ChangePasswordInput {
  user_id: number;
  old_password: string;
  new_password: string;
}

export interface ResetPasswordInput {
  user_id: number;
  new_password: string;
}

export interface UserRoleInfo {
  name: UserRole;
  label: string;
  description: string;
}

export interface UserSession {
  login_at: string;
  logout_at?: string;
}
