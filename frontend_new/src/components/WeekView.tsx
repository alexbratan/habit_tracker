import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { weekViewAPI, weeklyPlansAPI, WeekViewResponse, WeekViewItem, CreateWeeklyPlanRequest } from '../api';
import { habitsAPI, Habit } from '../api';
import { dayActionsAPI, DayActionRequest } from '../api';
import { overridesAPI, OverrideUpsert } from '../api';
import { ChevronLeft, Check, X, RotateCcw, Plus, Trash2, Calendar, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WeekView: React.FC = () => {
  const navigate = useNavigate();
  const [weekData, setWeekData] = useState<WeekViewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<any[]>([]);
  const [addingHabit, setAddingHabit] = useState<number | null>(null);
  const [newHabitForm, setNewHabitForm] = useState<{
    habitId: string;
    plannedDuration: number;
  }>({
    habitId: '',
    plannedDuration: 30
  });

  useEffect(() => {
    loadWeekView();
    loadHabits();
    loadWeeklyPlans();
  }, [selectedWeek]);

  // Add a refresh mechanism to sync with DayActions
  useEffect(() => {
    const handleStorageChange = () => {
      loadWeekView();
    };

    // Listen for storage changes (triggered by DayActions)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedWeek]);

  const loadHabits = async () => {
    try {
      const habitsData = await habitsAPI.getHabits();
      setHabits(habitsData);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const loadWeeklyPlans = async () => {
    try {
      const plansData = await weeklyPlansAPI.getWeeklyPlans();
      setWeeklyPlans(plansData);
    } catch (error) {
      console.error('Error loading weekly plans:', error);
    }
  };

  const loadWeekView = async () => {
    try {
      console.log('Loading week view for:', selectedWeek || 'current week');
      const data = await weekViewAPI.getWeekView(selectedWeek || undefined);
      console.log('WeekView API response:', data);
      console.log('Week data days:', data.days);
      
      // Check if any day has data
      Object.keys(data.days).forEach(dayKey => {
        const dayData = data.days[dayKey];
        console.log(`Day ${dayKey}:`, {
          hasItems: dayData?.items?.length > 0,
          itemsCount: dayData?.items?.length || 0,
          items: dayData?.items
        });
      });
      
      setWeekData(data);
    } catch (error) {
      console.error('Error loading week view:', error);
      // Set empty data to prevent crashes
      setWeekData({
        weekStart: '',
        weekEnd: '',
        days: {}
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHabit = (weekday: number) => {
    setAddingHabit(weekday);
    setNewHabitForm({
      habitId: '',
      plannedDuration: 30
    });
  };

  const handleSaveHabit = async (weekday: number) => {
    if (!newHabitForm.habitId) return;

    try {
      const weeklyPlanData: CreateWeeklyPlanRequest = {
        habitId: newHabitForm.habitId,
        weekday: weekday,
        plannedDuration: newHabitForm.plannedDuration
      };

      await weeklyPlansAPI.createWeeklyPlan(weeklyPlanData);
      
      // Refresh the week view to show the new habit
      await loadWeekView();
      
      // Close the form
      setAddingHabit(null);
      setNewHabitForm({ habitId: '', plannedDuration: 30 });
    } catch (error) {
      console.error('Error adding habit to weekly plan:', error);
    }
  };

  const handleCancelAdd = () => {
    setAddingHabit(null);
    setNewHabitForm({ habitId: '', plannedDuration: 30 });
  };

  const handleStatusChange = async (item: WeekViewItem, newStatus: 'planned' | 'done' | 'skipped', weekday: number) => {
    try {
      // If this is a template item (no date), we need to create an override for the current week
      if (!item.date) {
        // Calculate the date for this weekday in the selected week
        const weekStart = selectedWeek || new Date().toISOString().split('T')[0];
        const startDate = new Date(weekStart);
        // Adjust for Monday start (0 = Monday)
        const dayOffset = weekday;
        const itemDate = new Date(startDate);
        itemDate.setDate(startDate.getDate() + dayOffset);
        const dateStr = itemDate.toISOString().split('T')[0];
        
        // Create override for this specific date
        const overrideData: OverrideUpsert = {
          weeklyPlanId: item.weeklyPlanId,
          date: dateStr,
          status: newStatus,
          actualDuration: newStatus === 'done' ? item.plannedDuration : undefined
        };
        
        await overridesAPI.upsertOverride(overrideData);
      } else {
        // Use overrides API to change individual habit status
        const overrideData: OverrideUpsert = {
          weeklyPlanId: item.weeklyPlanId,
          date: item.date,
          status: newStatus,
          // Auto-set actualDuration when marking as done
          actualDuration: newStatus === 'done' ? item.plannedDuration : undefined
        };

        await overridesAPI.upsertOverride(overrideData);
      }
      
      // Refresh the week view to show updated status
      await loadWeekView();
    } catch (error) {
      console.error('Error changing habit status:', error);
    }
  };

  const handleDayAction = async (date: string, action: 'reset' | 'skip' | 'done') => {
    try {
      await dayActionsAPI.performDayAction({ date, action });
      
      // Refresh the week view to show updated status
      await loadWeekView();
    } catch (error) {
      console.error('Error performing day action:', error);
    }
  };

  const handleDeleteWeeklyPlan = async (weeklyPlanId: string) => {
    try {
      await weeklyPlansAPI.deleteWeeklyPlan(weeklyPlanId);
      
      // Refresh the week view to show updated habits
      await loadWeekView();
    } catch (error) {
      console.error('Error deleting weekly plan:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'status-done';
      case 'skipped':
        return 'status-skipped';
      default:
        return 'status-planned';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <Check className="w-4 h-4" />;
      case 'skipped':
        return <X className="w-4 h-4" />;
      default:
        return <div className="w-4 h-4 border-2 border-current rounded-full" />;
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getDefaultPlansForWeekday = (weekday: number) => {
    return weeklyPlans.filter(plan => plan.weekday === weekday);
  };

  const getHabitNameById = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    return habit ? habit.name : 'Unknown Habit';
  };

  const getItemsForDay = (dayKey: string, weekday: number) => {
    const dayData = weekData?.days?.[dayKey];
    const itemsForDay = dayData?.items || [];
    
    // If we have specific data for this day, return it
    if (itemsForDay.length > 0) {
      return itemsForDay;
    }
    
    // Otherwise, return default weekly plans as template items
    const defaultPlans = getDefaultPlansForWeekday(weekday);
    return defaultPlans.map(plan => ({
      weeklyPlanId: plan.id,
      overrideId: null,
      habitId: plan.habitId,
      habitName: getHabitNameById(plan.habitId),
      plannedDuration: plan.plannedDuration,
      actualDuration: undefined,
      status: 'planned' as const,
      date: '', // Will be filled with actual date when needed
      weekday: weekday,
      source: 'template',
      isOverride: false,
      note: null
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-pulse-slow">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mx-auto mb-4 animate-pulse" />
            <p className="text-neutral-600 font-medium">Loading your week...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!weekData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-neutral-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-neutral-400" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-700 mb-2">No week data available</h3>
          <p className="text-neutral-500">Try refreshing or selecting a different week</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-6 animate-fade-in"
    >
      <div className="card p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex items-center space-x-2 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Dashboard</span>
            </button>
            <div>
              <h2 className="text-3xl font-bold gradient-text mb-1">Week View</h2>
              <p className="text-neutral-600 text-sm">Plan and track your weekly habits</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-neutral-500" />
              <input
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="input-field text-sm"
                placeholder="Week start (Monday)"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedWeek('')}
                className="btn-secondary text-sm"
              >
                Current Week
              </button>
              <button
                onClick={loadWeekView}
                className="btn-primary text-sm flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-8 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-indigo-900">
                {weekData.weekStart} - {weekData.weekEnd}
              </span>
            </div>
            <div className="text-xs text-indigo-700 font-medium">
              Weekly Overview
            </div>
          </div>
        </div>

        {/* Week Table - Modern Grid View */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 gap-4">
              {WEEKDAYS.map((day, index) => {
                const dayKey = index.toString();
                const weekday = index;
                const itemsForDay = getItemsForDay(dayKey, weekday);
                const dateForDay = itemsForDay[0]?.date || new Date().toISOString().split('T')[0];
                
                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gradient-to-br from-white to-neutral-50 rounded-xl border border-neutral-200 overflow-hidden hover-lift"
                  >
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
                      <div className="font-semibold text-lg mb-1">{day.slice(0, 3)}</div>
                      <div className="text-xs opacity-90 mb-3">
                        {itemsForDay.length} {itemsForDay.length === 1 ? 'habit' : 'habits'}
                      </div>
                      
                      {/* Day Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleDayAction(dateForDay, 'done')}
                          className="btn-success text-xs py-1.5 px-2 flex items-center justify-center space-x-1"
                          title="Mark all habits as done"
                        >
                          <Check className="w-3 h-3" />
                          <span>All Done</span>
                        </button>
                        <button
                          onClick={() => handleDayAction(dateForDay, 'skip')}
                          className="btn-danger text-xs py-1.5 px-2 flex items-center justify-center space-x-1"
                          title="Skip all habits"
                        >
                          <X className="w-3 h-3" />
                          <span>Skip All</span>
                        </button>
                        <button
                          onClick={() => handleDayAction(dateForDay, 'reset')}
                          className="btn-secondary text-xs py-1.5 px-2 flex items-center justify-center space-x-1"
                          title="Reset to template"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 min-h-[200px]">
                      <AnimatePresence mode="wait">
                        {addingHabit === index ? (
                          <motion.div
                            key="add-form"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                          >
                            <select
                              value={newHabitForm.habitId}
                              onChange={(e) => setNewHabitForm({ ...newHabitForm, habitId: e.target.value })}
                              className="input-field text-sm"
                            >
                              <option value="">Select a habit</option>
                              {habits.map((habit) => (
                                <option key={habit.id} value={habit.id}>
                                  {habit.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Duration (minutes)"
                              value={newHabitForm.plannedDuration}
                              onChange={(e) => setNewHabitForm({ ...newHabitForm, plannedDuration: parseInt(e.target.value) || 0 })}
                              className="input-field text-sm"
                              min="1"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSaveHabit(index)}
                                className="btn-success text-xs flex-1"
                                disabled={!newHabitForm.habitId}
                              >
                                Add
                              </button>
                              <button
                                onClick={handleCancelAdd}
                                className="btn-secondary text-xs flex-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        ) : itemsForDay.length === 0 ? (
                          <motion.div
                            key="empty-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-3"
                          >
                            <div className="text-center py-4">
                              <div className="w-12 h-12 bg-neutral-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-neutral-400" />
                              </div>
                              <p className="text-neutral-500 text-sm italic">No habits planned</p>
                            </div>
                            <button
                              onClick={() => handleAddHabit(index)}
                              className="btn-primary w-full text-sm py-2"
                            >
                              <Plus className="w-4 h-4 inline mr-1" />
                              Add Habit
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="habits-list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-1.5"
                          >
                            {itemsForDay.map((item, itemIndex) => (
                              <motion.div
                                key={`${item.weeklyPlanId}-${item.date}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: itemIndex * 0.1 }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                                  item.status === 'done' 
                                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300 hover:border-emerald-400' 
                                    : item.status === 'skipped'
                                    ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 hover:border-red-400'
                                    : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300 hover:border-blue-400'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <div className={`p-1.5 rounded-md flex-shrink-0 ${
                                      item.status === 'done' 
                                        ? 'bg-emerald-500 text-white' 
                                        : item.status === 'skipped'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-blue-500 text-white'
                                    }`}>
                                      {getStatusIcon(item.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`font-medium text-xs truncate ${
                                        item.status === 'done' 
                                          ? 'text-emerald-800' 
                                          : item.status === 'skipped'
                                          ? 'text-red-800'
                                          : 'text-blue-800'
                                      }`}>
                                        {item.habitName}
                                      </h4>
                                      <div className={`text-xs ${
                                        item.status === 'done' 
                                          ? 'text-emerald-600' 
                                          : item.status === 'skipped'
                                          ? 'text-red-600'
                                          : 'text-blue-600'
                                      }`}>
                                        {formatMinutes(item.plannedDuration)}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteWeeklyPlan(item.weeklyPlanId)}
                                    className="p-1 hover:bg-white/50 rounded-md transition-colors flex-shrink-0"
                                    title="Remove from weekly plan"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </button>
                                </div>
                                
                                {item.actualDuration && (
                                  <div className={`text-xs p-1.5 rounded-md bg-white/60 mb-1.5 ${
                                    item.status === 'done' 
                                      ? 'text-emerald-700' 
                                      : item.status === 'skipped'
                                      ? 'text-red-700'
                                      : 'text-blue-700'
                                  }`}>
                                    <span className="font-medium">Actual:</span> {formatMinutes(item.actualDuration)}
                                  </div>
                                )}
                                
                                {item.isOverride && (
                                  <div className="text-xs font-medium mb-1.5 px-2 py-0.5 bg-white/60 rounded-md text-purple-700">
                                    Override
                                  </div>
                                )}
                                
                                {!item.date && (
                                  <div className="text-xs font-medium mb-1.5 px-2 py-0.5 bg-blue-100/80 rounded-md text-blue-700">
                                    Template
                                  </div>
                                )}
                                
                                {/* Individual Habit Status Buttons */}
                                <div className="flex space-x-1">
                                  {item.status !== 'done' && (
                                    <button
                                      onClick={() => handleStatusChange(item, 'done', weekday)}
                                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-1.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center"
                                      title="Mark this habit as done"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                  {item.status !== 'skipped' && (
                                    <button
                                      onClick={() => handleStatusChange(item, 'skipped', weekday)}
                                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-1.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center"
                                      title="Skip this habit"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                  {item.status !== 'planned' && (
                                    <button
                                      onClick={() => handleStatusChange(item, 'planned', weekday)}
                                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-1.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center"
                                      title="Reset this habit to planned"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                            <button
                              onClick={() => handleAddHabit(index)}
                              className="btn-secondary w-full text-xs py-2 mt-2"
                            >
                              <Plus className="w-3 h-3 inline mr-1" />
                              Add Another
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modern Legend */}
        <div className="mt-8 p-6 bg-gradient-to-r from-neutral-50 to-indigo-50 rounded-xl border border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center space-x-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full" />
            <span>Status Legend</span>
          </h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <div className="status-badge status-planned">
                <div className="w-4 h-4 border-2 border-current rounded-full mr-2" />
                <span>Planned</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="status-badge status-done">
                <Check className="w-4 h-4 mr-2" />
                <span>Done</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="status-badge status-skipped">
                <X className="w-4 h-4 mr-2" />
                <span>Skipped</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
