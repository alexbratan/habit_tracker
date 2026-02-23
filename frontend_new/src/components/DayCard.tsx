import React, { useState } from 'react';
import { PlanItem } from '../api/weekly';

interface DayCardProps {
  date: string;
  planItems: PlanItem[];
  onCreateItem: (title: string, description?: string, targetDate?: string) => void;
  onToggleItem: (itemId: number) => void;
  onDeleteItem: (itemId: number) => void;
}

export const DayCard: React.FC<DayCardProps> = ({
  date,
  planItems,
  onCreateItem,
  onToggleItem,
  onDeleteItem,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemTitle.trim()) {
      onCreateItem(newItemTitle, newItemDescription, date);
      setNewItemTitle('');
      setNewItemDescription('');
      setIsCreating(false);
    }
  };

  const completedCount = planItems.filter(item => item.is_completed).length;
  const totalCount = planItems.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{formatDate(date)}</h3>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{completedCount}/{totalCount}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {planItems.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              item.is_completed
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={() => onToggleItem(item.id)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <div>
                <p className={`font-medium ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {isCreating ? (
        <form onSubmit={handleCreateItem} className="space-y-3">
          <input
            type="text"
            placeholder="Task title"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={2}
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Add Task
        </button>
      )}
    </div>
  );
};
