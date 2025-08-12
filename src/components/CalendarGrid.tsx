// /src/components/CalendarGrid.tsx

import React, { useMemo } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Task } from "../types";
import {
  getDaysInMonth,
  isSameDay,
  isTaskInDateRange,
  categoryClass,
} from "../utils";

interface Props {
  currentDate: Date;
  tasks: Task[];
  onRangeSelect: (dates: Date[]) => void;
  onTaskUpdate: (id: string, start: Date, end: Date) => void;
  onCellMouseDown: (e: React.MouseEvent, index: number) => void;
  onCellMouseEnter: (index: number) => void;
  dragStateSelected: number[];
  activeDraggingId: string | null;
  onTaskEdgeMouseDown: (
    e: React.MouseEvent,
    task: Task,
    dragType: "resize-left" | "resize-right"
  ) => void;
  onMonthPrev: () => void;
  onMonthNext: () => void;
}

const DayHeader = () => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="day-headers">
      {dayNames.map((d) => (
        <div key={d} className="day-header">
          {d}
        </div>
      ))}
    </div>
  );
};

const DraggableStart: React.FC<{
  task: Task;
  topPx: number;
  activeDraggingId: string | null;
}> = ({ task, topPx, activeDraggingId }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `task-${task.id}`,
  });
  const transformStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const cls = `task-bar ${categoryClass(task.category)} ${
    activeDraggingId === `task-${task.id}` ? "dragging" : ""
  }`;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cls}
      style={{ top: `${topPx}px`, borderRadius: "4px", ...transformStyle }}
    >
      <span className="task-text">{task.name}</span>
    </div>
  );
};

const DayCell: React.FC<{
  date: Date;
  index: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  tasksForDate: Task[];
  onCellMouseDown: (e: React.MouseEvent, index: number) => void;
  onCellMouseEnter: (index: number) => void;
  onTaskEdgeMouseDown: (
    e: React.MouseEvent,
    task: Task,
    dragType: "resize-left" | "resize-right"
  ) => void;
  activeDraggingId: string | null;
}> = ({
  date,
  index,
  isCurrentMonth,
  isToday,
  isSelected,
  tasksForDate,
  onCellMouseDown,
  onCellMouseEnter,
  onTaskEdgeMouseDown,
  activeDraggingId,
}) => {
  const { setNodeRef } = useDroppable({ id: `cell-${index}` });

  return (
    <div
      ref={setNodeRef}
      className={`cell ${
        isCurrentMonth ? "current-month" : "other-month"
      } ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
      onMouseDown={(e) => onCellMouseDown(e, index)}
      onMouseEnter={() => onCellMouseEnter(index)}
      data-cell-index={index}
    >
      <div className={`date-number ${isToday ? "date-today" : ""}`}>
        {date.getDate()}
      </div>

      {tasksForDate.map((task, ti) => {
        const isStart = isSameDay(task.startDate, date);
        const isEnd = isSameDay(task.endDate, date);
        const isOnly = isStart && isEnd;
        const topPx = 24 + ti * 18;

        if (isStart) {
          return (
            <div key={task.id}>
              <DraggableStart
                task={task}
                topPx={topPx}
                activeDraggingId={activeDraggingId}
              />
              {/* Resize handles only on start cell */}
              <div
                className="resize-left"
                onMouseDown={(e) => onTaskEdgeMouseDown(e, task, "resize-left")}
              />
              {isEnd && (
                <div
                  className="resize-right"
                  onMouseDown={(e) =>
                    onTaskEdgeMouseDown(e, task, "resize-right")
                  }
                />
              )}
            </div>
          );
        }

        // Non-start cells just show the bar fragment
        return (
          <div
            key={`${task.id}-${index}`}
            className={`task-bar ${categoryClass(task.category)}`}
            style={{ top: `${topPx}px`, borderRadius: isOnly ? "4px" : "0" }}
          />
        );
      })}
    </div>
  );
};

const GridWrapper = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      currentDate,
      tasks,
    //   onRangeSelect,
      onTaskUpdate,
      onCellMouseDown,
      onCellMouseEnter,
      dragStateSelected,
      activeDraggingId,
      onTaskEdgeMouseDown,
      onMonthPrev,
      onMonthNext,
    },
    ref
  ) => {
    const days = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
      const activeId = event.active.id as string;
      const overId = event.over?.id as string | undefined;
      if (!overId) return;
      if (!activeId.startsWith("task-")) return;
      const taskId = activeId.slice(5);
      const targetIndex = parseInt(overId.split("-")[1], 10);
      if (Number.isNaN(targetIndex)) return;
    //   const targetDate = days[targetIndex];
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return;
      const origStartIndex = days.findIndex((d) => isSameDay(d, t.startDate));
      const origEndIndex = days.findIndex((d) => isSameDay(d, t.endDate));
      const duration = origEndIndex - origStartIndex;
      const offset = targetIndex - origStartIndex;
      const newStartIdx = Math.max(
        0,
        Math.min(days.length - duration - 1, origStartIndex + offset)
      );
      const newEndIdx = newStartIdx + duration;
      onTaskUpdate(taskId, days[newStartIdx], days[newEndIdx]);
    };

    return (
      <div>
        <div className="calendar-header">
          <div className="header">
            <button className="nav-btn" onClick={onMonthPrev}>
              &lt;
            </button>
            <h1>
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h1>
            <button className="nav-btn" onClick={onMonthNext}>
              &gt;
            </button>
          </div>
          
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="calendar-container" ref={ref}>
            <DayHeader />
            <div className="days-grid">
              {days.map((date, idx) => {
                const isCurr = date.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(date, new Date());
                const isSel = dragStateSelected.includes(idx);
                const tasksForDate = tasks.filter((t) =>
                  isTaskInDateRange(t, date)
                );
                return (
                  <DayCell
                    key={idx}
                    date={date}
                    index={idx}
                    isCurrentMonth={isCurr}
                    isToday={isToday}
                    isSelected={isSel}
                    tasksForDate={tasksForDate}
                    onCellMouseDown={onCellMouseDown}
                    onCellMouseEnter={onCellMouseEnter}
                    onTaskEdgeMouseDown={onTaskEdgeMouseDown}
                    activeDraggingId={activeDraggingId}
                  />
                );
              })}
            </div>
          </div>
        </DndContext>
      </div>
    );
  }
);

export default GridWrapper;
