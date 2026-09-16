import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-reports-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './reports-layout.component.html',
  styleUrls: ['./reports-layout.component.scss'],
})
export class ReportsLayoutComponent {}
