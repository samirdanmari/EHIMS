export type UserRole =
  | 'admin'
  | 'manager'
  | 'storekeeper'
  | 'cashier'
  | 'waiter';

export const APP_PERMISSIONS = [
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'View and manage inventory and stock.',
  },
  {
    key: 'pos',
    label: 'Point of Sale',
    description: 'Access order entry and POS tools.',
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    description: 'View and manage suppliers and purchases.',
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'View business and operational reports.',
  },
  {
    key: 'eod',
    label: 'EOD & Shifts',
    description: 'View shifts and end-of-day reports.',
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'View and manage customer accounts.',
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Manage user accounts and access.',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Change application settings.',
  },
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number]['key'];

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  permissions?: AppPermission[];
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
  permissions?: AppPermission[];
}

export interface UserCreateInput {
  username: string;
  display_name: string;
  password: string;
  role: UserRole;
  permissions?: AppPermission[];
}

export interface UserUpdateInput {
  display_name?: string;
  role?: UserRole;
  is_active?: boolean;
  permissions?: AppPermission[];
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
