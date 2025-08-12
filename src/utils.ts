// /src/utils.ts

import type { Task, Category } from './types';

export const getDaysInMonth = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days: Date[] = [];

  // previous month filler
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(new Date(year, month, -(startDayOfWeek - 1 - i)));
  }
  // current month
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  // next month filler up to 42 cells
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) days.push(new Date(year, month + 1, d));
  return days;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const isTaskInDateRange = (task: Task, date: Date) => {
  const ts = new Date(task.startDate); ts.setHours(0,0,0,0);
  const te = new Date(task.endDate); te.setHours(23,59,59,999);
  const d = new Date(date); d.setHours(12,0,0,0);
  return d >= ts && d <= te;
};

export const categoryClass = (category: Category) => {
  switch (category) {
    case 'To Do': return 'cat-blue';
    case 'In Progress': return 'cat-yellow';
    case 'Review': return 'cat-purple';
    case 'Completed': return 'cat-green';
    default: return 'cat-gray';
  }
};

export const generateId = () => Math.random().toString(36).slice(2, 9);

export const loadTasksFromStorage = (): Task[] => {
  try {
    const raw = localStorage.getItem('tasks');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    return parsed.map(p => ({ ...p, startDate: new Date(p.startDate), endDate: new Date(p.endDate) }));
  } catch {
    return [];
  }
};

export const saveTasksToStorage = (tasks: Task[]) => {
  try {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  } catch {}
};
