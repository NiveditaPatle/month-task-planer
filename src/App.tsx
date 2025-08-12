import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Task, Category, DragState, TaskDragState } from "./types";
import "./styles.css";
import TaskModal from "./components/TaskModal";
import FilterPanel from "./components/FilterPanel";
import GridWrapper from "./components/CalendarGrid";
import {
  getDaysInMonth,
  isSameDay,
  isTaskInDateRange,
  generateId,
} from "./utils";

const MIN_TASK_DAYS = 1;

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const raw = localStorage.getItem("tasks");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as any[];
      return parsed.map((p) => ({
        ...p,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
      }));
    } catch {
      return [];
    }
  });

  // Filters & search state
  const [filters, setFilters] = useState<{
    categories: Category[];
    timeFilter: string;
  }>({
    categories: ["To Do", "In Progress", "Review", "Completed"],
    timeFilter: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Drag selection state for creating tasks
  const [dragState, setDragState] = useState<DragState>({
    isSelecting: false,
    startCell: null,
    currentCell: null,
    selectedCells: [],
  });

  // New: separate state for selected dates (for modal)
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Task drag/resize state
  const [taskDragState, setTaskDragState] = useState<TaskDragState>({
    isDragging: false,
    taskId: null,
    dragType: null,
    startMouseX: 0,
    startCellIndex: 0,
    originalTask: null,
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<Partial<Task> | undefined>(
    undefined
  );

  // Current calendar days (42 cells)
  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  // Persist tasks on change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Filtered + searched tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!filters.categories.includes(task.category)) return false;

      if (searchTerm.trim()) {
        if (!task.name.toLowerCase().includes(searchTerm.toLowerCase()))
          return false;
      }

      if (filters.timeFilter) {
        const today = new Date();
        const limitDays = parseInt(filters.timeFilter[0], 10);
        const filterEnd = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + limitDays * 7
        );
        if (task.startDate > filterEnd) return false;
      }

      return true;
    });
  }, [tasks, filters, searchTerm]);

  // Get cell index from mouse position (for resize and drag)
  const gridRef = useRef<HTMLDivElement>(null);
  const getCellIndexFromPos = useCallback(
    (clientX: number, clientY: number) => {
      if (!gridRef.current) return -1;
      const rect = gridRef.current.getBoundingClientRect();

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return -1;

      const colWidth = rect.width / 7;
      const rowHeight = rect.height / 6;

      const col = Math.floor(x / colWidth);
      const row = Math.floor(y / rowHeight);

      const index = row * 7 + col;
      if (index < 0 || index >= 42) return -1;
      return index;
    },
    []
  );

  // ----------------------
  // Mouse handlers for drag selection (task creation)

  const onCellMouseDown = useCallback(
    (e: React.MouseEvent, index: number) => {
      if (taskDragState.isDragging) return;
      setDragState({
        isSelecting: true,
        startCell: index,
        currentCell: index,
        selectedCells: [index],
      });
    },
    [taskDragState.isDragging]
  );

  const onCellMouseEnter = useCallback(
    (index: number) => {
      if (!dragState.isSelecting || dragState.startCell === null) return;
      const start = dragState.startCell;
      const end = index;
      const range =
        start <= end
          ? Array.from({ length: end - start + 1 }, (_, i) => start + i)
          : Array.from({ length: start - end + 1 }, (_, i) => end + i);
      setDragState((state) => ({
        ...state,
        currentCell: index,
        selectedCells: range,
      }));
    },
    [dragState.isSelecting, dragState.startCell]
  );

  // UPDATED: handle mouseup to open modal but keep selectedDates separately
  useEffect(() => {
    const onMouseUp = () => {
      if (dragState.isSelecting) {
        if (dragState.selectedCells.length > 0) {
          const dates = dragState.selectedCells
            .map((idx) => days[idx])
            .sort((a, b) => a.getTime() - b.getTime());

          setModalInitial(undefined);
          setModalOpen(true);
          setSelectedDates(dates);
        }
        setDragState({
          isSelecting: false,
          startCell: null,
          currentCell: null,
          selectedCells: [],
        });
      }
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [dragState, days]);

  // ----------------------
  // Task CRUD

  const onSaveTask = useCallback(
    (payload: { name: string; category: Category; startDate: Date; endDate: Date }) => {
      if (modalInitial?.id) {
        // Edit existing task
        setTasks((prev) =>
          prev.map((t) =>
            t.id === modalInitial.id ? { ...t, ...payload } : t
          )
        );
      } else {
        // Create new
        setTasks((prev) => [
          ...prev,
          { id: generateId(), ...payload },
        ]);
      }
    },
    [modalInitial]
  );

  // ----------------------
  // Task move by drag-drop (using dnd-kit)

  const onTaskUpdate = useCallback(
    (id: string, newStart: Date, newEnd: Date) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, startDate: newStart, endDate: newEnd } : t))
      );
    },
    []
  );

  // ----------------------
  // Resize handlers

  const handleTaskEdgeMouseDown = useCallback(
    (e: React.MouseEvent, task: Task, dragType: "resize-left" | "resize-right") => {
      e.stopPropagation();
      e.preventDefault();

      const idx = getCellIndexFromPos(e.clientX, e.clientY);
      setTaskDragState({
        isDragging: true,
        taskId: task.id,
        dragType,
        startCellIndex: idx === -1 ? 0 : idx,
        startMouseX: e.clientX,
        originalTask: { ...task },
      });
    },
    [getCellIndexFromPos]
  );

  useEffect(() => {
    if (!taskDragState.isDragging || !taskDragState.originalTask) return;

    const onMove = (ev: MouseEvent) => {
      const { dragType, originalTask } = taskDragState;
      if (!dragType || !originalTask) return;

      const idx = getCellIndexFromPos(ev.clientX, ev.clientY);
      if (idx === -1) return;

      const origStart = days.findIndex((d) =>
        isSameDay(d, originalTask.startDate)
      );
      const origEnd = days.findIndex((d) => isSameDay(d, originalTask.endDate));

      let newStart = origStart;
      let newEnd = origEnd;

      if (dragType === "resize-left") {
        newStart = Math.min(idx, origEnd - MIN_TASK_DAYS + 1);
        newStart = Math.max(0, newStart);
      } else if (dragType === "resize-right") {
        newEnd = Math.max(idx, origStart + MIN_TASK_DAYS - 1);
        newEnd = Math.min(days.length - 1, newEnd);
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === originalTask.id
            ? { ...t, startDate: days[newStart], endDate: days[newEnd] }
            : t
        )
      );
    };

    const onUp = () => {
      setTaskDragState({
        isDragging: false,
        taskId: null,
        dragType: null,
        startCellIndex: 0,
        startMouseX: 0,
        originalTask: null,
      });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [taskDragState, days, getCellIndexFromPos]);

  // ----------------------
  // Month navigation

  const onMonthPrev = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };
  const onMonthNext = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  // ----------------------
  // Active dragging ID for style
  const activeDraggingId = taskDragState.isDragging
    ? `task-${taskDragState.taskId}`
    : null;

  return (
    <div className="page">
      <div className="container">
        <aside className="left-column">
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </aside>

        <main className="main-column">
          <GridWrapper
            currentDate={currentDate}
            tasks={filteredTasks}
            onRangeSelect={(dates) => {
              setModalInitial(undefined);
              setModalOpen(true);
              setSelectedDates(dates); // make sure to set selectedDates here if using onRangeSelect
            }}
            onTaskUpdate={onTaskUpdate}
            onCellMouseDown={onCellMouseDown}
            onCellMouseEnter={onCellMouseEnter}
            dragStateSelected={dragState.selectedCells}
            activeDraggingId={activeDraggingId}
            onTaskEdgeMouseDown={handleTaskEdgeMouseDown}
            onMonthPrev={onMonthPrev}
            onMonthNext={onMonthNext}
            ref={gridRef}
          />
        </main>
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveTask}
        selectedDates={selectedDates}
        initial={modalInitial}
      />
    </div>
  );
};

export default App;
