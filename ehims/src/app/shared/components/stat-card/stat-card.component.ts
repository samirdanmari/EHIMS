import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss']
})
export class StatCardComponent {
  title = input.required<string>();
  value = input.required<string | number>();
  subtitle = input<string>();
  icon = input.required<string>();
  trend = input<'up' | 'down' | 'neutral'>();
  trendValue = input<string>();
  accentColor = input<string>('#3b82f6'); // default primary color
}
