import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  value = input.required<number>(); // 0 to 100
  showLabel = input<boolean>(true);
  height = input<string>('0.5rem');

  clampedValue = computed(() => {
    const v = this.value();
    return Math.max(0, Math.min(100, Math.round(v)));
  });
}
