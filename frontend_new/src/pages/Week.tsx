import React, { useState, useEffect } from 'react';
import { weeklyPlansAPI, habitsAPI, WeeklyPlan } from '../api';
import { WeekView } from '../components/WeekView';

export const Week: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Just ensure we can load the data
    const loadData = async () => {
      try {
        await Promise.all([
          weeklyPlansAPI.getWeeklyPlans(),
          habitsAPI.getHabits()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WeekView />
    </div>
  );
};
