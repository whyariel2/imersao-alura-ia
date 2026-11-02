import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task, TaskFilterParams, CreateTaskPayload, UpdateTaskPayload } from '../models/task.model';
import { Phase, Stack, AppSettings, StudySession, CreateSessionPayload } from '../models/metadata.model';

@Injectable({
  providedIn: 'root'
})
export class TaskApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getTasks(filters?: TaskFilterParams): Observable<Task[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.phase_id) params = params.set('phase_id', filters.phase_id);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.stack_id) params = params.set('stack_id', filters.stack_id);
      if (filters.search) params = params.set('search', filters.search);
    }
    return this.http.get<{ data: Task[] }>(`${this.baseUrl}/tasks`, { params }).pipe(
      map(res => res.data)
    );
  }

  getTask(id: number): Observable<Task> {
    return this.http.get<{ data: Task }>(`${this.baseUrl}/tasks/${id}`).pipe(
      map(res => res.data)
    );
  }

  createTask(payload: CreateTaskPayload): Observable<Task> {
    return this.http.post<{ data: Task }>(`${this.baseUrl}/tasks`, payload).pipe(
      map(res => res.data)
    );
  }

  updateTask(id: number, payload: UpdateTaskPayload): Observable<Task> {
    return this.http.put<{ data: Task }>(`${this.baseUrl}/tasks/${id}`, payload).pipe(
      map(res => res.data)
    );
  }

  updateTaskStatus(id: number, status: 'todo' | 'in_progress' | 'done'): Observable<Task> {
    return this.http.patch<{ data: Task }>(`${this.baseUrl}/tasks/${id}/status`, { status }).pipe(
      map(res => res.data)
    );
  }

  reorderTasks(phase_id: number, items: Array<{ id: number; position: number }>): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/tasks/reorder`, { phase_id, items });
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}`);
  }

  rescheduleAll(): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks/reschedule`, {});
  }

  getPhases(): Observable<Phase[]> {
    return this.http.get<{ data: Phase[] }>(`${this.baseUrl}/phases`).pipe(
      map(res => res.data)
    );
  }

  getStacks(): Observable<Stack[]> {
    return this.http.get<{ data: Stack[] }>(`${this.baseUrl}/stacks`).pipe(
      map(res => res.data)
    );
  }

  getSettings(): Observable<AppSettings> {
    return this.http.get<{ data: AppSettings }>(`${this.baseUrl}/settings`).pipe(
      map(res => res.data)
    );
  }

  updateSettings(settings: Partial<AppSettings>): Observable<AppSettings> {
    return this.http.put<{ data: AppSettings }>(`${this.baseUrl}/settings`, settings).pipe(
      map(res => res.data)
    );
  }

  createSession(payload: CreateSessionPayload): Observable<StudySession> {
    return this.http.post<{ data: StudySession }>(`${this.baseUrl}/sessions`, payload).pipe(
      map(res => res.data)
    );
  }

  getRecentSessions(): Observable<StudySession[]> {
    return this.http.get<{ data: StudySession[] }>(`${this.baseUrl}/sessions/recent`).pipe(
      map(res => res.data)
    );
  }

  getTaskSessions(taskId: number): Observable<StudySession[]> {
    return this.http.get<{ data: StudySession[] }>(`${this.baseUrl}/sessions/task/${taskId}`).pipe(
      map(res => res.data)
    );
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sessions/${id}`);
  }

  getWeeklyMetrics(date?: string): Observable<any> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<{ data: any }>(`${this.baseUrl}/metrics/weekly`, { params }).pipe(
      map(res => res.data)
    );
  }

  getStackRanking(): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.baseUrl}/metrics/stacks`).pipe(
      map(res => res.data)
    );
  }

  getSummaryMetrics(): Observable<any> {
    return this.http.get<{ data: any }>(`${this.baseUrl}/metrics/summary`).pipe(
      map(res => res.data)
    );
  }
}
