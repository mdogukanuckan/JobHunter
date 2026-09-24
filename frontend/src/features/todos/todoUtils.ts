import type { Todo, TodoPriority } from '../../api/types';

export const PRIORITIES: TodoPriority[] = ['High', 'Medium', 'Low'];

export const PRIORITY_COLORS: Record<TodoPriority, 'error' | 'warning' | 'default'> = {
  High: 'error',
  Medium: 'warning',
  Low: 'default',
};

export const PRIORITY_HEX: Record<TodoPriority, string> = {
  High: '#dc2626',
  Medium: '#f59e0b',
  Low: '#9ca3af',
};

const PRIORITY_RANK: Record<TodoPriority, number> = { High: 0, Medium: 1, Low: 2 };

export type DueGroup = 'overdue' | 'today' | 'week' | 'later' | 'noDate';
export const DUE_GROUPS: DueGroup[] = ['overdue', 'today', 'week', 'later', 'noDate'];

/** Acik bir gorevin son tarihine gore hangi gruba dustugu (yerel saatle). */
export function dueGroupOf(todo: Todo, now = new Date()): DueGroup {
  if (!todo.dueAt) return 'noDate';
  const due = new Date(todo.dueAt);
  if (due < now) return 'overdue';
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (due < startOfTomorrow) return 'today';
  const in7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  if (due < in7Days) return 'week';
  return 'later';
}

/** Acik gorev sirasi: son tarihi yakin olan once, esitse yuksek oncelik once. */
export function compareOpen(a: Todo, b: Todo): number {
  const da = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
  const db = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
  if (da !== db) return da - db;
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

/** Menude rozet olarak gosterilecek sayi: gecikmis + bugun biten acik gorevler. */
export function countAttention(todos: Todo[] | undefined): number {
  if (!todos) return 0;
  const now = new Date();
  return todos.filter((t) => {
    if (t.isCompleted) return false;
    const g = dueGroupOf(t, now);
    return g === 'overdue' || g === 'today';
  }).length;
}
