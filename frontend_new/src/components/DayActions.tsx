import React, { useState } from 'react';
import { dayActionsAPI, DayActionRequest } from '../api';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DayActions: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Adjust for Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    return WEEKDAYS.map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date.toISOString().split('T')[0];
    });
  };

  const performAction = async (action: 'reset' | 'skip' | 'done') => {
    setIsLoading(true);
    try {
      const request: DayActionRequest = {
        date: selectedDate,
        action,
      };
      
      const result = await dayActionsAPI.performDayAction(request);
      console.log(`Action ${action} completed:`, result);
      
      // Trigger storage event to notify other components
      window.dispatchEvent(new Event('storage'));
      
      // Show success message
      alert(`Action ${action} completed successfully!`);
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      alert(`Error performing ${action}: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Day Actions</h2>
      
      {/* Quick Date Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Date Selection:</label>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {getWeekDates().map((date, index) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-2 py-1 text-xs rounded ${
                selectedDate === date 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {WEEKDAYS[index].slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom Date Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => performAction('done')}
          disabled={isLoading}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : '✓ Mark All as Done'}
        </button>
        
        <button
          onClick={() => performAction('skip')}
          disabled={isLoading}
          className="w-full bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : '⊘ Skip All'}
        </button>
        
        <button
          onClick={() => performAction('reset')}
          disabled={isLoading}
          className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : '↺ Reset to Template'}
        </button>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Actions:</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li><strong>✓ Mark All as Done:</strong> Mark all planned items as completed for the selected date</li>
          <li><strong>⊘ Skip All:</strong> Skip all planned items for the selected date</li>
          <li><strong>↺ Reset to Template:</strong> Remove all overrides and reset to weekly template for the selected date</li>
        </ul>
      </div>
    </div>
  );
};
