import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-inventory-tab',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './inventory-tab.component.html',
  styleUrl: './inventory-tab.component.scss',
})
export class InventoryTabComponent {}
