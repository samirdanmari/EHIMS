export type UserRole = 'admin' | 'manager' | 'storekeeper' | 'cashier' | 'waiter';

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  pin?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface Session {
  id: number;
  user_id: number;
  login_at: string;
  logout_at?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  session_id?: number;
  error?: string;
}
