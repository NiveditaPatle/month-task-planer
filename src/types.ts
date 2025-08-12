// /src/types.ts
export type Category = 'To Do' | 'In Progress' | 'Review' | 'Completed';

export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  category: Category;
}

export interface DragState {
  isSelecting: boolean;
  startCell: number | null;
  currentCell: number | null;
  selectedCells: number[];
}

export interface TaskDragState {
  isDragging: boolean;
  taskId: string | null;
  dragType: 'move' | 'resize-left' | 'resize-right' | null;
  startMouseX: number;
  startCellIndex: number;
  originalTask: Task | null;
}
