import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { TaskApiService } from '../../services/task-api.service';
import { Task } from '../../models/task.model';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StackChipComponent } from '../../shared/stack-chip/stack-chip.component';
import { ProgressBarComponent } from '../../shared/progress-bar/progress-bar.component';
import { ModalComponent } from '../../shared/modal/modal.component';

interface DailyBar {
  dayName: string;
  date: string;
  hours: number;
  height: number;
  y: number;
  x: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    StatusBadgeComponent,
    StackChipComponent,
    ProgressBarComponent,
    ModalComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(TaskApiService);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  readonly tasks = signal<Task[]>([]);
  readonly weeklyMetrics = signal<any | null>(null);
  readonly summaryMetrics = signal<any | null>(null);
  readonly stackRanking = signal<any[]>([]);

  // Quick Study Session Modal
  readonly isSessionModalOpen = signal<boolean>(false);
  readonly activeTaskForSession = signal<Task | null>(null);

  readonly sessionForm = new FormGroup({
    date: new FormControl<string>(new Date().toISOString().slice(0, 10), [Validators.required]),
    hours: new FormControl<number>(1.5, [Validators.required, Validators.min(0.25)]),
    note: new FormControl<string>(''),
  });

  // Derived tasks at risk
  readonly tasksAtRisk = computed(() => {
    return this.tasks().filter(t => t.at_risk);
  });

  // Next tasks to study (pending, ordered by sequence)
  readonly nextTasks = computed(() => {
    return this.tasks()
      .filter(t => t.status !== 'done')
      .slice(0, 5);
  });

  // SVG Chart Bars calculations (viewBox: 0 0 560 220)
  readonly chartBars = computed<DailyBar[]>(() => {
    const weekly = this.weeklyMetrics();
    if (!weekly || !weekly.daily_breakdown) return [];

    const breakdown: Array<{ date: string; day_name: string; hours: number }> = weekly.daily_breakdown;
    const maxHour = Math.max(4, ...breakdown.map(d => d.hours));
    const chartHeight = 140; // Max height of a bar in px
    const baseY = 170;       // Y coordinate for zero
    const barWidth = 36;
    const startX = 50;
    const gap = 70;

    return breakdown.map((item, index) => {
      const h = maxHour > 0 ? (item.hours / maxHour) * chartHeight : 0;
      return {
        dayName: item.day_name,
        date: item.date,
        hours: item.hours,
        height: Math.max(item.hours > 0 ? 4 : 0, h),
        y: baseY - h,
        x: startX + index * gap,
      };
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api.getWeeklyMetrics().subscribe({
      next: data => this.weeklyMetrics.set(data),
      error: () => this.errorMessage.set('Falha ao carregar métricas da semana.'),
    });

    this.api.getSummaryMetrics().subscribe({
      next: data => this.summaryMetrics.set(data),
      error: () => this.errorMessage.set('Falha ao carregar resumo de progresso.'),
    });

    this.api.getStackRanking().subscribe({
      next: data => this.stackRanking.set(data),
      error: () => this.errorMessage.set('Falha ao carregar ranking de stacks.'),
    });

    this.api.getTasks().subscribe({
      next: tasks => {
        this.tasks.set(tasks);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Falha ao carregar tarefas.');
        this.isLoading.set(false);
      },
    });
  }

  openSessionModal(task: Task): void {
    this.activeTaskForSession.set(task);
    this.sessionForm.reset({
      date: new Date().toISOString().slice(0, 10),
      hours: 1.5,
      note: '',
    });
    this.isSessionModalOpen.set(true);
  }

  closeSessionModal(): void {
    this.isSessionModalOpen.set(false);
    this.activeTaskForSession.set(null);
  }

  saveSession(): void {
    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    const task = this.activeTaskForSession();
    if (!task) return;

    const val = this.sessionForm.value;
    this.api.createSession({
      task_id: task.id,
      date: val.date!,
      hours: Number(val.hours),
      note: val.note ? val.note.trim() : null,
    }).subscribe({
      next: () => {
        this.closeSessionModal();
        this.loadData();
      },
      error: () => this.errorMessage.set('Erro ao registrar sessão de estudos.'),
    });
  }

  quickComplete(task: Task): void {
    this.api.updateTaskStatus(task.id, 'done').subscribe({
      next: () => this.loadData(),
      error: () => this.errorMessage.set('Erro ao concluir tarefa.'),
    });
  }
}
