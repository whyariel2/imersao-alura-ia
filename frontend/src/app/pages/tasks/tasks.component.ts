import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TaskApiService } from '../../services/task-api.service';
import { Task, CreateTaskPayload, UpdateTaskPayload } from '../../models/task.model';
import { Phase, Stack } from '../../models/metadata.model';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StackChipComponent } from '../../shared/stack-chip/stack-chip.component';
import { ProgressBarComponent } from '../../shared/progress-bar/progress-bar.component';
import { ModalComponent } from '../../shared/modal/modal.component';

interface PhaseGroup {
  phase: Phase;
  tasks: Task[];
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DragDropModule,
    StatusBadgeComponent,
    StackChipComponent,
    ProgressBarComponent,
    ModalComponent,
  ],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksComponent implements OnInit {
  private readonly api = inject(TaskApiService);

  // Data signals
  readonly tasks = signal<Task[]>([]);
  readonly phases = signal<Phase[]>([]);
  readonly stacks = signal<Stack[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  // Filter signals
  readonly selectedStatus = signal<string>('all');
  readonly selectedPhase = signal<string>('all');
  readonly selectedStack = signal<string>('all');
  readonly searchQuery = signal<string>('');

  // Modals state
  readonly isTaskModalOpen = signal<boolean>(false);
  readonly isSessionModalOpen = signal<boolean>(false);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly editingTask = signal<Task | null>(null);
  readonly activeTaskForSession = signal<Task | null>(null);
  readonly taskToDelete = signal<Task | null>(null);

  // Reactive Forms
  readonly taskForm = new FormGroup({
    phase_id: new FormControl<number>(1, [Validators.required]),
    title: new FormControl<string>('', [Validators.required, Validators.minLength(2)]),
    description: new FormControl<string>(''),
    status: new FormControl<'todo' | 'in_progress' | 'done'>('todo', [Validators.required]),
    estimated_hours: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
    due_date: new FormControl<string>(''),
    pinned_due_date: new FormControl<boolean>(false),
    alura_url: new FormControl<string>(''),
    selected_stacks: new FormControl<number[]>([]),
  });

  readonly sessionForm = new FormGroup({
    date: new FormControl<string>(new Date().toISOString().slice(0, 10), [Validators.required]),
    hours: new FormControl<number>(1, [Validators.required, Validators.min(0.25)]),
    note: new FormControl<string>(''),
  });

  // Derived filtered tasks
  readonly filteredTasks = computed(() => {
    const list = this.tasks();
    const status = this.selectedStatus();
    const phaseId = this.selectedPhase();
    const stackId = this.selectedStack();
    const search = this.searchQuery().toLowerCase().trim();

    return list.filter(task => {
      if (status !== 'all' && task.status !== status) return false;
      if (phaseId !== 'all' && task.phase_id !== Number(phaseId)) return false;
      if (stackId !== 'all' && !task.stacks.some(s => s.id === Number(stackId))) return false;
      if (search) {
        const titleMatch = task.title.toLowerCase().includes(search);
        const descMatch = (task.description || '').toLowerCase().includes(search);
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });
  });

  // Group filtered tasks by phase
  readonly groupedTasks = computed<PhaseGroup[]>(() => {
    const allPhases = this.phases();
    const tasks = this.filteredTasks();

    const groups: PhaseGroup[] = [];
    for (const phase of allPhases) {
      const phaseTasks = tasks
        .filter(t => t.phase_id === phase.id)
        .sort((a, b) => a.position - b.position);

      if (this.selectedPhase() === 'all' || Number(this.selectedPhase()) === phase.id) {
        groups.push({
          phase,
          tasks: phaseTasks,
        });
      }
    }
    return groups;
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api.getPhases().subscribe({
      next: phases => this.phases.set(phases),
      error: () => this.errorMessage.set('Falha ao carregar fases.'),
    });

    this.api.getStacks().subscribe({
      next: stacks => this.stacks.set(stacks),
      error: () => this.errorMessage.set('Falha ao carregar stacks.'),
    });

    this.refreshTasks();
  }

  refreshTasks(): void {
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

  // Filter setters
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedStatus.set(target.value);
  }

  onPhaseChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedPhase.set(target.value);
  }

  onStackChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedStack.set(target.value);
  }

  // Drag and Drop reordering within a phase
  onDrop(phaseId: number, event: CdkDragDrop<Task[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const group = this.groupedTasks().find(g => g.phase.id === phaseId);
    if (!group) return;

    const tasksCopy = [...group.tasks];
    moveItemInArray(tasksCopy, event.previousIndex, event.currentIndex);

    const reorderedItems = tasksCopy.map((task, index) => ({
      id: task.id,
      position: index + 1,
    }));

    // Optimistic local update
    const updatedTasks = this.tasks().map(t => {
      const match = reorderedItems.find(item => item.id === t.id);
      return match ? { ...t, position: match.position } : t;
    });
    this.tasks.set(updatedTasks);

    // Call API
    this.api.reorderTasks(phaseId, reorderedItems).subscribe({
      next: () => this.refreshTasks(),
      error: () => this.refreshTasks(),
    });
  }

  // Quick Status Toggle
  toggleStatus(task: Task, nextStatus: 'todo' | 'in_progress' | 'done'): void {
    this.api.updateTaskStatus(task.id, nextStatus).subscribe({
      next: () => this.refreshTasks(),
      error: () => this.errorMessage.set('Erro ao atualizar status da tarefa.'),
    });
  }

  // Create / Edit Modal handlers
  openCreateModal(): void {
    this.editingTask.set(null);
    const defaultPhaseId = this.phases().length > 0 ? this.phases()[0].id : 1;
    this.taskForm.reset({
      phase_id: defaultPhaseId,
      title: '',
      description: '',
      status: 'todo',
      estimated_hours: 6,
      due_date: '',
      pinned_due_date: false,
      alura_url: '',
      selected_stacks: [],
    });
    this.isTaskModalOpen.set(true);
  }

  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.taskForm.reset({
      phase_id: task.phase_id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      estimated_hours: task.estimated_hours,
      due_date: task.due_date || '',
      pinned_due_date: task.pinned_due_date,
      alura_url: task.alura_url || '',
      selected_stacks: task.stacks.map(s => s.id),
    });
    this.isTaskModalOpen.set(true);
  }

  closeTaskModal(): void {
    this.isTaskModalOpen.set(false);
    this.editingTask.set(null);
  }

  saveTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const val = this.taskForm.value;
    const editing = this.editingTask();

    if (editing) {
      const payload: UpdateTaskPayload = {
        phase_id: val.phase_id ?? undefined,
        title: val.title ?? undefined,
        description: val.description || null,
        status: val.status ?? undefined,
        estimated_hours: val.estimated_hours ?? 0,
        due_date: val.due_date ? val.due_date : null,
        pinned_due_date: val.pinned_due_date ?? false,
        alura_url: val.alura_url ? val.alura_url : null,
        stack_ids: val.selected_stacks ?? [],
      };

      this.api.updateTask(editing.id, payload).subscribe({
        next: () => {
          this.closeTaskModal();
          this.refreshTasks();
        },
        error: () => this.errorMessage.set('Erro ao atualizar tarefa.'),
      });
    } else {
      const payload: CreateTaskPayload = {
        phase_id: Number(val.phase_id),
        title: val.title!.trim(),
        description: val.description ? val.description.trim() : null,
        status: val.status || 'todo',
        estimated_hours: Number(val.estimated_hours) || 0,
        due_date: val.due_date ? val.due_date : null,
        pinned_due_date: Boolean(val.pinned_due_date),
        alura_url: val.alura_url ? val.alura_url.trim() : null,
        stack_ids: val.selected_stacks || [],
      };

      this.api.createTask(payload).subscribe({
        next: () => {
          this.closeTaskModal();
          this.refreshTasks();
        },
        error: () => this.errorMessage.set('Erro ao criar tarefa.'),
      });
    }
  }

  // Quick Study Session Modal handlers
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
        this.refreshTasks();
      },
      error: () => this.errorMessage.set('Erro ao registrar horas de estudo.'),
    });
  }

  // Delete Modal handlers
  confirmDelete(task: Task): void {
    this.taskToDelete.set(task);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.taskToDelete.set(null);
  }

  executeDelete(): void {
    const task = this.taskToDelete();
    if (!task) return;

    this.api.deleteTask(task.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.refreshTasks();
      },
      error: () => this.errorMessage.set('Erro ao excluir tarefa.'),
    });
  }

  // Stack selection toggle in Task Modal
  isStackSelected(stackId: number): boolean {
    const selected = this.taskForm.controls.selected_stacks.value || [];
    return selected.includes(stackId);
  }

  toggleStackSelection(stackId: number): void {
    const current = this.taskForm.controls.selected_stacks.value || [];
    const index = current.indexOf(stackId);
    let updated: number[];
    if (index >= 0) {
      updated = current.filter(id => id !== stackId);
    } else {
      updated = [...current, stackId];
    }
    this.taskForm.controls.selected_stacks.setValue(updated);
  }
}
