import { Injectable, signal, computed, inject } from '@angular/core';
import {
  User,
  LoginCredentials,
  LoginResponse,
  UserRole,
} from '../models/user.model';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private electronService = inject(ElectronService);

  public currentUser = signal<User | null>(null);
  public isLoggedIn = computed(() => this.currentUser() !== null);
  public userRole = computed(() => this.currentUser()?.role ?? null);

  public sessionId: string | null = null;

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await this.electronService.invoke<LoginResponse>(
        'auth:login',
        credentials,
      );

      if (response.success && response.user) {
        this.currentUser.set(response.user);
        this.sessionId = response.session_id ?? null;
      }

      return response;
    } catch (error) {
      return { success: false, error: 'Login failed due to an error' };
    }
  }

  async logout(): Promise<void> {
    if (this.sessionId) {
      try {
        await this.electronService.invoke('auth:logout', {
          session_id: this.sessionId,
        });
      } catch (error) {
        console.error('Logout error', error);
      }
    }
    this.currentUser.set(null);
    this.sessionId = null;
  }

  async verifyPin(pin: string): Promise<{ valid: boolean; user?: User }> {
    try {
      return await this.electronService.invoke<{ valid: boolean; user?: User }>(
        'auth:verify-pin',
        { pin },
      );
    } catch (error) {
      console.error('Verify PIN error', error);
      return { valid: false };
    }
  }

  hasRole(roles: UserRole[]): boolean {
    const role = this.userRole();
    if (!role) return false;
    return roles.includes(role);
  }
}
