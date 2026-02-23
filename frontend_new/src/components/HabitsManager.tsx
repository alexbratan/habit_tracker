import React, { useState, useEffect } from 'react';
import { habitsAPI, Habit, CreateHabitRequest } from '../api';

export const HabitsManager: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newHabit, setNewHabit] = useState<CreateHabitRequest>({
    name: '',
    default_duration: 30,
  });

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const data = await habitsAPI.getHabits();
      setHabits(data);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabit.name.trim()) return;

    try {
      const created = await habitsAPI.createHabit(newHabit);
      setHabits([...habits, created]);
      setNewHabit({ name: '', default_duration: 30 });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await habitsAPI.deleteHabit(id);
      setHabits(habits.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  if (isLoading) {
    return <div>Loading habits...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Habits</h2>
      
      {isCreating ? (
        <form onSubmit={createHabit} className="mb-4 space-y-3">
          <input
            type="text"
            placeholder="Habit name"
            value={newHabit.name}
            onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <input
            type="number"
            placeholder="Default duration (minutes)"
            value={newHabit.default_duration}
            onChange={(e) => setNewHabit({ ...newHabit, default_duration: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Habit
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
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 mb-4"
        >
          Add New Habit
        </button>
      )}

      <div className="space-y-2">
        {habits.map((habit) => (
          <div key={habit.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium">{habit.name}</h3>
              <p className="text-sm text-gray-600">Default: {habit.default_duration} minutes</p>
            </div>
            <button
              onClick={() => deleteHabit(habit.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
