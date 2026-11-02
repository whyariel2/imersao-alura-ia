import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { TaskApiService } from '../../services/task-api.service';
import { ThemeService, ThemeMode } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(TaskApiService);
  private readonly themeService = inject(ThemeService);

  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly settingsForm = new FormGroup({
    weekly_capacity_hours: new FormControl<number>(10, [
      Validators.required,
      Validators.min(1),
      Validators.max(168),
    ]),
    theme: new FormControl<ThemeMode>('dark', [Validators.required]),
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api.getSettings().subscribe({
      next: settings => {
        const capacity = Number(settings.weekly_capacity_hours) || 10;
        const currentTheme = (settings.theme === 'light' || settings.theme === 'dark') ? settings.theme : this.themeService.theme();

        this.settingsForm.patchValue({
          weekly_capacity_hours: capacity,
          theme: currentTheme,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Falha ao carregar as configurações do banco de dados.');
        this.isLoading.set(false);
      },
    });
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const formVal = this.settingsForm.value;
    const capacity = Number(formVal.weekly_capacity_hours);
    const theme = (formVal.theme as ThemeMode) || 'dark';

    this.api.updateSettings({
      weekly_capacity_hours: capacity,
      theme,
    }).subscribe({
      next: () => {
        this.themeService.setTheme(theme);
        this.isSaving.set(false);
        this.successMessage.set('Configurações salvas e cronograma recalculado com sucesso!');
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set('Erro ao salvar as configurações.');
      },
    });
  }

  triggerReschedule(): void {
    this.isSaving.set(true);
    this.api.rescheduleAll().subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set('Recálculo de prazos finalizado com sucesso!');
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set('Erro ao recalcular os prazos.');
      },
    });
  }
}
