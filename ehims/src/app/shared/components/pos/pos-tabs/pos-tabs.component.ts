import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-pos-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './pos-tabs.component.html',
  styleUrl: './pos-tabs.component.scss',
})
export class PosTabsComponent {
  authService = inject(AuthService);
}
