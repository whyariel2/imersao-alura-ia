import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { TaskApiService } from '../../services/task-api.service';
import { Task } from '../../models/task.model';
import { Phase } from '../../models/metadata.model';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StackChipComponent } from '../../shared/stack-chip/stack-chip.component';
import { ModalComponent } from '../../shared/modal/modal.component';

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  tasks: Task[];
  totalHours: number;
}

interface PhaseGroup {
  phase: Phase;
  tasks: Task[];
  totalHours: number;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
    StackChipComponent,
    ModalComponent,
  ],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent implements OnInit {
  private readonly api = inject(TaskApiService);

  readonly tasks = signal<Task[]>([]);
  readonly phases = signal<Phase[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Grouping mode: 'month' | 'phase'
  readonly groupMode = signal<'month' | 'phase'>('month');

  // Quick Study Session Modal
  readonly isSessionModalOpen = signal<boolean>(false);
  readonly activeTaskForSession = signal<Task | null>(null);

  readonly sessionForm = new FormGroup({
    date: new FormControl<string>(new Date().toISOString().slice(0, 10), [Validators.required]),
    hours: new FormControl<number>(1.5, [Validators.required, Validators.min(0.25)]),
    note: new FormControl<string>(''),
  });

  // Derived tasks grouped by projected Month
  readonly groupedByMonth = computed<MonthGroup[]>(() => {
    const list = this.tasks();
    const groupsMap = new Map<string, { label: string; tasks: Task[]; hours: number }>();

    for (const task of list) {
      let key = 'undated';
      let label = 'Sem Data Estimada';

      if (task.due_date) {
        const [y, m] = task.due_date.split('-');
        key = `${y}-${m}`;

        const dateObj = new Date(Number(y), Number(m) - 1, 1);
        const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { label, tasks: [], hours: 0 });
      }

      const g = groupsMap.get(key)!;
      g.tasks.push(task);
      g.hours += task.remaining_hours > 0 ? task.remaining_hours : task.estimated_hours;
    }

    // Sort keys chronologically
    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => {
      if (a === 'undated') return 1;
      if (b === 'undated') return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => {
      const g = groupsMap.get(key)!;
      return {
        monthKey: key,
        monthLabel: g.label,
        tasks: g.tasks.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
        totalHours: Math.round(g.hours * 10) / 10,
      };
    });
  });

  // Derived tasks grouped by Phase
  readonly groupedByPhase = computed<PhaseGroup[]>(() => {
    const allPhases = this.phases();
    const list = this.tasks();

    return allPhases.map(phase => {
      const phaseTasks = list
        .filter(t => t.phase_id === phase.id)
        .sort((a, b) => a.position - b.position);

      const hours = phaseTasks.reduce((acc, t) => acc + (t.remaining_hours > 0 ? t.remaining_hours : t.estimated_hours), 0);

      return {
        phase,
        tasks: phaseTasks,
        totalHours: Math.round(hours * 10) / 10,
      };
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api.getPhases().subscribe({
      next: phases => this.phases.set(phases),
      error: () => this.errorMessage.set('Falha ao carregar fases.'),
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

  setGroupMode(mode: 'month' | 'phase'): void {
    this.groupMode.set(mode);
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

  quickToggleStatus(task: Task): void {
    const nextStatus = task.status === 'done' ? 'in_progress' : 'done';
    this.api.updateTaskStatus(task.id, nextStatus).subscribe({
      next: () => this.loadData(),
      error: () => this.errorMessage.set('Erro ao alterar status da tarefa.'),
    });
  }
}
