// /src/components/FilterPanel.tsx

import React from 'react';
import { Filter, Search } from 'lucide-react';
import type { Category } from '../types';
import { categoryClass } from '../utils';

interface Props {
  filters: { categories: Category[]; timeFilter: string };
  onFiltersChange: (f: { categories: Category[]; timeFilter: string }) => void;
  searchTerm: string;
  onSearchChange: (s: string) => void;
}

const FilterPanel: React.FC<Props> = ({ filters, onFiltersChange, searchTerm, onSearchChange }) => {
  const categories: Category[] = ['To Do', 'In Progress', 'Review', 'Completed'];
  const timeFilters = [
    { label: 'Tasks within 1 week', value: '1week' },
    { label: 'Tasks within 2 weeks', value: '2weeks' },
    { label: 'Tasks within 3 weeks', value: '3weeks' },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <Filter />
        <h3>Filters</h3>
      </div>

      <div className="search-row">
        <Search />
        <input className="input" placeholder="Search tasks..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
      </div>

      <div className="section">
        <h4>Categories</h4>
        <div className="category-list">
          {categories.map(c => (
            <label key={c} className="category-row">
              <input
                type="checkbox"
                checked={filters.categories.includes(c)}
                onChange={(e) => {
                  const newCategories = e.target.checked ? [...filters.categories, c] : filters.categories.filter(x => x !== c);
                  onFiltersChange({ ...filters, categories: newCategories });
                }}
              />
              <span className={`color-dot ${categoryClass(c)}`} />
              <span className="cat-label">{c}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="section">
        <h4>Duration</h4>
        <div className='category-list'>
          {timeFilters.map(t => (
            <label key={t.value} className="radio-row">
              <input type="radio" name="timeFilter" value={t.value} checked={filters.timeFilter === t.value} onChange={() => onFiltersChange({ ...filters, timeFilter: t.value })} />
              <span className="cat-label">{t.label}</span>
            </label>
          ))}
          <label className="radio-row">
            <input type="radio" name="timeFilter" value="" checked={filters.timeFilter === ''} onChange={() => onFiltersChange({ ...filters, timeFilter: '' })} />
            <span className="cat-label">All tasks</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
