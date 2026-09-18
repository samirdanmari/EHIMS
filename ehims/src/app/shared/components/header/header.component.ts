import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UpdateService } from '../../../core/services/update.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  authService = inject(AuthService);
  router = inject(Router);
  updateService = inject(UpdateService);

  pageTitle = input<string>('Dashboard');
  pageSubtitle = input<string>('');
  
  isDropdownOpen = signal(false);

  toggleDropdown() {
    this.isDropdownOpen.update(v => !v);
  }

  logout() {
    // this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  changePassword() {
    this.isDropdownOpen.set(false);
    // implement password change logic or navigate
  }

  onUpdateClick() {
    this.updateService.openRelease();
  }
}
