import React from 'react';
import { PlanItem } from '../api/weekly';

interface PlanItemRowProps {
  item: PlanItem;
  weekDates: Date[];
  onToggle: (itemId: number) => void;
  onDelete: (itemId: number) => void;
}

export const PlanItemRow: React.FC<PlanItemRowProps> = ({
  item,
  weekDates,
  onToggle,
  onDelete,
}) => {
  const getItemStatusForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    if (item.target_date === dateStr) {
      return item.is_completed ? 'completed' : 'active';
    }
    return 'none';
  };

  const getCellClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300';
      case 'active':
        return 'bg-blue-50 border-blue-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getCellContent = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'active':
        return '○';
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-8 gap-0 border-b hover:bg-gray-50">
      <div className="p-4 border-r border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`font-medium text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-gray-600 mt-1">{item.description}</p>
            )}
          </div>
          <button
            onClick={() => onDelete(item.id)}
            className="ml-2 text-red-600 hover:text-red-800 text-sm"
          >
            ×
          </button>
        </div>
      </div>
      
      {weekDates.map((date, index) => {
        const status = getItemStatusForDate(date);
        return (
          <div
            key={index}
            className={`p-4 border-r border-gray-200 text-center cursor-pointer transition-colors ${getCellClass(status)}`}
            onClick={() => status !== 'none' && onToggle(item.id)}
          >
            <span className="text-lg">{getCellContent(status)}</span>
          </div>
        );
      })}
    </div>
  );
};
