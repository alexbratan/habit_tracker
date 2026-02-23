import React, { useState, useEffect } from 'react';
import { weeklyPlansAPI, habitsAPI, WeeklyPlan, Habit, CreateWeeklyPlanRequest } from '../api';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WeeklyPlansManager: React.FC = () => {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState<CreateWeeklyPlanRequest>({
    habitId: '',
    weekday: 0,
    plannedDuration: 30,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, habitsData] = await Promise.all([
        weeklyPlansAPI.getWeeklyPlans(),
        habitsAPI.getHabits(),
      ]);
      console.log('Loaded habits:', habitsData);
      console.log('Loaded plans:', plansData);
      setPlans(plansData);
      setHabits(habitsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.habitId) return;

    console.log('Creating plan with data:', newPlan);
    console.log('Selected habit ID:', newPlan.habitId);
    console.log('Selected weekday:', newPlan.weekday);
    console.log('Planned duration:', newPlan.plannedDuration);

    try {
      const created = await weeklyPlansAPI.createWeeklyPlan(newPlan);
      console.log('Successfully created plan:', created);
      setPlans([...plans, created]);
      setNewPlan({ habitId: '', weekday: 0, plannedDuration: 30 });
      setIsCreating(false);
    } catch (error: any) {
      console.error('Error creating weekly plan:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
    }
  };

  const deletePlan = async (id: string) => {
    try {
      await weeklyPlansAPI.deleteWeeklyPlan(id);
      setPlans(plans.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting weekly plan:', error);
    }
  };

  const getHabitName = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    return habit?.name || 'Unknown Habit';
  };

  if (isLoading) {
    return <div>Loading weekly plans...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Weekly Plans</h2>
      
      {/* Debug info */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-sm flex justify-between items-center">
        <span>Habits loaded: {habits.length}</span>
        <div className="space-x-2">
          {isLoading && <span className="text-blue-600">Loading...</span>}
          <button
            onClick={loadData}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>
      
      {isCreating ? (
        <form onSubmit={createPlan} className="mb-4 space-y-3">
          <select
            value={newPlan.habitId}
            onChange={(e) => setNewPlan({ ...newPlan, habitId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">Select a habit</option>
            {habits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
          
          <select
            value={newPlan.weekday}
            onChange={(e) => setNewPlan({ ...newPlan, weekday: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {WEEKDAYS.map((day, index) => (
              <option key={index} value={index}>
                {day}
              </option>
            ))}
          </select>
          
          <input
            type="number"
            placeholder="Planned duration (minutes)"
            value={newPlan.plannedDuration}
            onChange={(e) => setNewPlan({ ...newPlan, plannedDuration: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          
          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Plan
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
          disabled={habits.length === 0}
        >
          {habits.length === 0 ? 'Create habits first' : 'Add Weekly Plan'}
        </button>
      )}

      <div className="space-y-2">
        {plans.map((plan) => (
          <div key={plan.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium">{getHabitName(plan.habitId)}</h3>
              <p className="text-sm text-gray-600">
                {WEEKDAYS[plan.weekday]} - {plan.plannedDuration} minutes
              </p>
            </div>
            <button
              onClick={() => deletePlan(plan.id)}
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
