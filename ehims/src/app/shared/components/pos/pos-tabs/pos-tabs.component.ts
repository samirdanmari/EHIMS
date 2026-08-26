import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-pos-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './pos-tabs.component.html',
  styleUrl: './pos-tabs.component.scss',
})
export class PosTabsComponent {}
