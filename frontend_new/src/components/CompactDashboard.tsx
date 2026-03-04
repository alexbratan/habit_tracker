import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { weekViewAPI, WeekViewResponse, DayData, WeekViewItem } from '../api/weekView';
import { overridesAPI, OverrideUpsert } from '../api';
import { HabitModal } from './HabitModal';
import { Streak } from './Streak';

export const CompactDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [todayProgress, setTodayProgress] = useState<number>(0);
  const [animatedProgress, setAnimatedProgress] = useState<number>(0);
  const [nextHabit, setNextHabit] = useState<WeekViewItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [streakRefreshTrigger, setStreakRefreshTrigger] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshTime = useRef<number>(0);

  // Animate progress when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(todayProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [todayProgress]);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      const weekData: WeekViewResponse = await weekViewAPI.getWeekView();
      const today = new Date();
      const todayWeekday = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert to 0-6 (Mon-Sun)
      const todayStr = today.toISOString().split('T')[0];
      
      const dayData: DayData | undefined = weekData.days[todayWeekday.toString()];
      
      console.log('Today data debug:', {
        todayWeekday,
        todayStr,
        dayData,
        weekDataKeys: Object.keys(weekData.days)
      });
      
      if (dayData) {
        // Calculate today's progress by minutes (exclude skipped items)
        const totalPlannedMinutes = dayData.items
          .reduce((sum, item) => sum + item.plannedDuration, 0);
        
        const completedMinutes = dayData.items
          .filter(item => item.status === 'done')
          .reduce((sum, item) => sum + (item.actualDuration || item.plannedDuration), 0);
        
        const progress = totalPlannedMinutes > 0 ? Math.round((completedMinutes / totalPlannedMinutes) * 100) : 0;
        
        console.log('Progress calculation (by minutes):', {
          items: dayData.items,
          totalPlannedMinutes,
          completedMinutes,
          progress
        });
        
        setTodayProgress(progress);
        
        // Find next habit to do (first planned item, not skipped)
        const nextItem = dayData.items.find(item => 
          item.status === 'planned'
        );
        setNextHabit(nextItem || null);
        
        console.log('Next habit found:', nextItem);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (item: WeekViewItem, newStatus: 'planned' | 'done' | 'skipped') => {
    try {
      const now = Date.now();
      
      // Use overrides API to change individual habit status
      const overrideData: OverrideUpsert = {
        weeklyPlanId: item.weeklyPlanId,
        date: item.date,
        status: newStatus,
        // Auto-set actualDuration when marking as done
        actualDuration: newStatus === 'done' ? item.plannedDuration : undefined
      };

      await overridesAPI.upsertOverride(overrideData);
      
      // Refresh the dashboard data to show updated status
      await loadTodayData();
      
      // Trigger streak refresh if habit was marked as done (with time-based deduplication)
      if (newStatus === 'done' && now - lastRefreshTime.current > 1000) {
        lastRefreshTime.current = now;
        setStreakRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error changing habit status:', error);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-700';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-600';
    if (progress >= 50) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8">Today's Overview</h1>
          
          {/* Streak Section */}
          <div className="mb-8">
            <Streak refreshTrigger={streakRefreshTrigger} />
          </div>
          
          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Today's Progress</h2>
              <span className={`text-2xl font-bold transition-all duration-500 ease-out ${getProgressColor(animatedProgress)}`}>
                {animatedProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ease-out ${getProgressBgColor(animatedProgress)}`}
                style={{ width: `${animatedProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {animatedProgress}% of today's habits completed
            </div>
          </div>

          {/* Next Habit Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">Next Habit to Complete</h2>
            {nextHabit ? (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-indigo-900">{nextHabit.habitName}</h3>
                    <p className="text-sm text-indigo-700">
                      Planned duration: {nextHabit.plannedDuration} minutes
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">
                      Status: <span className="font-medium">{nextHabit.status}</span>
                    </p>
                  </div>
                  <div className="text-2xl">📋</div>
                </div>
                
                {/* Status Change Buttons */}
                <div className="flex space-x-2">
                  {nextHabit.status !== 'done' && (
                    <button
                      onClick={() => handleStatusChange(nextHabit, 'done')}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
                      title="Mark this habit as done"
                    >
                      ✓ Done
                    </button>
                  )}
                  {nextHabit.status !== 'skipped' && (
                    <button
                      onClick={() => handleStatusChange(nextHabit, 'skipped')}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                      title="Skip this habit"
                    >
                      ✗ Skip
                    </button>
                  )}
                  {nextHabit.status !== 'planned' && (
                    <button
                      onClick={() => handleStatusChange(nextHabit, 'planned')}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                      title="Reset this habit to planned"
                    >
                      ○ Reset
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🎉</div>
                  <div>
                    <h3 className="text-lg font-medium text-green-900">All done for today!</h3>
                    <p className="text-sm text-green-700">You've completed all your planned habits.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/week')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <span>📅</span>
              <span>View Weekly Plan</span>
            </button>
            
            <button
              onClick={() => setIsHabitModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <span>🎯</span>
              <span>View Habits</span>
            </button>
          </div>
        </div>
      </div>

      <HabitModal 
        isOpen={isHabitModalOpen} 
        onClose={() => setIsHabitModalOpen(false)} 
      />
    </>
  );
};
