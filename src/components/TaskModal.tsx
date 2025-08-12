// /src/components/TaskModal.tsx

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Category, Task } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; category: Category; startDate: Date; endDate: Date }) => void;
  selectedDates: Date[]; // contiguous dates (from drag)
  initial?: Partial<Task>;
}

const TaskModal: React.FC<Props> = ({ isOpen, onClose, onSave, selectedDates, initial }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category>((initial?.category as Category) ?? 'To Do');

  useEffect(() => {
    if (isOpen) {
      setName(initial?.name ?? '');
      setCategory((initial?.category as Category) ?? 'To Do');
    }
  }, [isOpen, initial]);

  // If modal is closed or no selected dates, do not render
  if (!isOpen || selectedDates.length === 0) return null;

  const start = selectedDates[0];
  const end = selectedDates[selectedDates.length - 1];

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{initial ? 'Edit Task' : 'Create Task'}</h3>
          <button onClick={onClose} className="icon-btn"><X /></button>
        </div>

        <label className="label">Task Name</label>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <label className="label">Category</label>
        <select
          className="select"
          value={category}
          onChange={e => setCategory(e.target.value as Category)}
        >
          <option>To Do</option>
          <option>In Progress</option>
          <option>Review</option>
          <option>Completed</option>
        </select>

        <div className="note">
            <span className='label'>Dates:</span>
           {start ? start.toDateString() : 'N/A'} — {end ? end.toDateString() : 'N/A'}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!name.trim()) return;
              onSave({ name: name.trim(), category, startDate: start, endDate: end });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
