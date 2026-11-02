import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  status = input.required<'todo' | 'in_progress' | 'done'>();

  label = computed(() => {
    switch (this.status()) {
      case 'done':
        return 'Concluído';
      case 'in_progress':
        return 'Em Andamento';
      case 'todo':
      default:
        return 'A Fazer';
    }
  });

  statusClass = computed(() => {
    switch (this.status()) {
      case 'done':
        return 'badge-done';
      case 'in_progress':
        return 'badge-progress';
      case 'todo':
      default:
        return 'badge-todo';
    }
  });
}
