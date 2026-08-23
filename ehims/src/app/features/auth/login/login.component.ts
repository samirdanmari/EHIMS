import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  isLoading = signal(false);
  showPassword = signal(false);

  form = new FormGroup({
    username: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    password: new FormControl('', { validators: [Validators.required], nonNullable: true }),
  });

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    try {
      const result = await this.authService.login({
        username: this.form.controls.username.value,
        password: this.form.controls.password.value,
      });

      if (result.success) {
        this.notificationService.success('Welcome back!', `Logged in as ${result.user?.display_name}`);
        this.router.navigate(['/dashboard']);
      } else {
        this.notificationService.error('Login failed', result.error || 'Invalid username or password.');
      }
    } catch (err) {
      this.notificationService.error('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
