import { describe, it, expect } from 'vitest';
import { calculateReschedule } from '../services/reschedule.service.js';
import { RescheduleTaskInput } from '../types/index.js';

describe('Reschedule Pure Algorithm Unit Tests', () => {
  const baseToday = '2026-11-01'; // Reference date: 2026-11-01

  it('1. should calculate sequential due dates based on weekly capacity', () => {
    // Capacity = 14 hours / week = 2 hours / day
    // Task 1: 4 hours (needs 2 days: day 0 and day 1 -> 2026-11-02)
    // Task 2: 6 hours (needs 3 days: day 2, day 3, day 4 -> 2026-11-05)
    const tasks: RescheduleTaskInput[] = [
      { id: 1, status: 'todo', position: 1, estimated_hours: 4, spent_hours: 0, due_date: null, pinned_due_date: false },
      { id: 2, status: 'todo', position: 2, estimated_hours: 6, spent_hours: 0, due_date: null, pinned_due_date: false },
    ];

    const results = calculateReschedule(tasks, 14, baseToday);

    expect(results).toHaveLength(2);
    expect(results[0].calculated_due_date).toBe('2026-11-02');
    expect(results[0].due_date).toBe('2026-11-02');
    expect(results[0].remaining_hours).toBe(4);

    expect(results[1].calculated_due_date).toBe('2026-11-05');
    expect(results[1].due_date).toBe('2026-11-05');
    expect(results[1].remaining_hours).toBe(6);
  });

  it('2. Task concluída adiantada (task completed early or with hours logged): reduces remaining hours and pulls forward subsequent tasks', () => {
    // Capacity: 14 hrs/week = 2 hrs/day
    // Case A: Task 1 has 4 hours estimated, 0 spent
    const tasksA: RescheduleTaskInput[] = [
      { id: 1, status: 'todo', position: 1, estimated_hours: 4, spent_hours: 0, due_date: null, pinned_due_date: false },
      { id: 2, status: 'todo', position: 2, estimated_hours: 4, spent_hours: 0, due_date: null, pinned_due_date: false },
    ];
    const resultsA = calculateReschedule(tasksA, 14, baseToday);
    expect(resultsA[1].due_date).toBe('2026-11-04'); // Finish day 4

    // Case B: Task 1 was studied early and has 3 hours already spent out of 4 (only 1 hour remaining)
    const tasksB: RescheduleTaskInput[] = [
      { id: 1, status: 'in_progress', position: 1, estimated_hours: 4, spent_hours: 3, due_date: null, pinned_due_date: false },
      { id: 2, status: 'todo', position: 2, estimated_hours: 4, spent_hours: 0, due_date: null, pinned_due_date: false },
    ];
    const resultsB = calculateReschedule(tasksB, 14, baseToday);

    expect(resultsB[0].remaining_hours).toBe(1);
    expect(resultsB[0].due_date).toBe('2026-11-01'); // Finishes day 1 (consumed 1 hour of the 2h daily capacity)
    // Task 2 can start immediately on day 1 with the remaining 1 hour, needing 3 more hours -> finishes on 2026-11-03!
    expect(resultsB[1].due_date).toBe('2026-11-03');
    // Task 2 was pulled forward from 2026-11-04 to 2026-11-03!
    expect(resultsB[1].due_date < resultsA[1].due_date!).toBe(true);
  });

  it('3. Task atrasada (task with increased estimated hours or zero progress): pushes later tasks back', () => {
    // Capacity: 7 hrs/week = 1 hr/day
    // Task 1 gets delayed/expanded from 2 hours to 6 hours
    const tasksDelayed: RescheduleTaskInput[] = [
      { id: 1, status: 'in_progress', position: 1, estimated_hours: 6, spent_hours: 0, due_date: null, pinned_due_date: false },
      { id: 2, status: 'todo', position: 2, estimated_hours: 2, spent_hours: 0, due_date: null, pinned_due_date: false },
    ];

    const results = calculateReschedule(tasksDelayed, 7, baseToday);
    // Task 1 needs 6 days: 2026-11-01 to 2026-11-06
    expect(results[0].due_date).toBe('2026-11-06');
    // Task 2 is pushed back to 2026-11-08
    expect(results[1].due_date).toBe('2026-11-08');
  });

  it('4. Task fixada (pinned_due_date = true): preserves date and sets at_risk when calculated date exceeds pinned date', () => {
    // Capacity: 7 hrs/week = 1 hr/day
    // Task 1 takes 5 days (needs until 2026-11-05)
    // Task 2 has a pinned due_date of 2026-11-04 (earlier than projected completion 2026-11-07!)
    const tasks: RescheduleTaskInput[] = [
      { id: 1, status: 'todo', position: 1, estimated_hours: 5, spent_hours: 0, due_date: null, pinned_due_date: false },
      { id: 2, status: 'todo', position: 2, estimated_hours: 2, spent_hours: 0, due_date: '2026-11-04', pinned_due_date: true },
      { id: 3, status: 'todo', position: 3, estimated_hours: 2, spent_hours: 0, due_date: '2026-11-30', pinned_due_date: true },
    ];

    const results = calculateReschedule(tasks, 7, baseToday);

    // Task 2: Pinned date MUST be preserved
    expect(results[1].due_date).toBe('2026-11-04');
    expect(results[1].pinned_due_date).toBe(true);
    // Calculated date is 2026-11-07, which is > 2026-11-04, so it MUST be flagged at_risk!
    expect(results[1].calculated_due_date).toBe('2026-11-07');
    expect(results[1].at_risk).toBe(true);

    // Task 3: Pinned to 2026-11-30, calculated is 2026-11-09 -> NOT at risk
    expect(results[2].due_date).toBe('2026-11-30');
    expect(results[2].at_risk).toBe(false);
  });

  it('5. Capacidade alterada (weekly capacity changed): accelerates or slows down the entire pipeline', () => {
    const tasks: RescheduleTaskInput[] = [
      { id: 1, status: 'todo', position: 1, estimated_hours: 10, spent_hours: 0, due_date: null, pinned_due_date: false },
      { id: 2, status: 'todo', position: 2, estimated_hours: 10, spent_hours: 0, due_date: null, pinned_due_date: false },
    ];

    // With 10 hours/week (10/7 = ~1.43h/day), 20 total hours takes 14 days
    const results10 = calculateReschedule(tasks, 10, baseToday);
    // With 20 hours/week (double speed), 20 total hours takes 7 days
    const results20 = calculateReschedule(tasks, 20, baseToday);

    expect(results20[1].due_date! < results10[1].due_date!).toBe(true);
    expect(results20[1].due_date).toBe('2026-11-07');
    expect(results10[1].due_date).toBe('2026-11-14');
  });

  it('6. Tasks com status "done" nunca são recalculadas', () => {
    const tasks: RescheduleTaskInput[] = [
      { id: 1, status: 'done', position: 1, estimated_hours: 10, spent_hours: 10, due_date: '2026-10-15', pinned_due_date: false },
      { id: 2, status: 'todo', position: 2, estimated_hours: 4, spent_hours: 0, due_date: null, pinned_due_date: false },
    ];

    const results = calculateReschedule(tasks, 14, baseToday);

    // Task 1 ('done') is omitted from the pending recalculations
    expect(results.some(r => r.id === 1)).toBe(false);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(2);
    expect(results[0].due_date).toBe('2026-11-02');
  });
});
