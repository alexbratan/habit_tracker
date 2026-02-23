import React from 'react';
import { PlanItem } from '../api/weekly';
import { PlanItemRow } from './PlanItemRow';

interface WeekGridProps {
  weekDates: Date[];
  planItems: PlanItem[];
  onToggleItem: (itemId: number) => void;
  onDeleteItem: (itemId: number) => void;
  onSelectDate: (date: string) => void;
}

export const WeekGrid: React.FC<WeekGridProps> = ({
  weekDates,
  planItems,
  onToggleItem,
  onDeleteItem,
  onSelectDate,
}) => {
  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDate = (date: Date) => {
    return date.getDate();
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-8 gap-0 border-b">
        <div className="p-4 bg-gray-50 font-semibold text-sm">Tasks</div>
        {weekDates.map((date, index) => (
          <div
            key={index}
            className="p-4 bg-gray-50 text-center cursor-pointer hover:bg-gray-100"
            onClick={() => onSelectDate(date.toISOString().split('T')[0])}
          >
            <div className="font-semibold text-sm">{formatDayName(date)}</div>
            <div className="text-lg">{formatDate(date)}</div>
          </div>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {planItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No plan items for this week. Create your first plan item to get started!
          </div>
        ) : (
          planItems.map((item) => (
            <PlanItemRow
              key={item.id}
              item={item}
              weekDates={weekDates}
              onToggle={onToggleItem}
              onDelete={onDeleteItem}
            />
          ))
        )}
      </div>
    </div>
  );
};
