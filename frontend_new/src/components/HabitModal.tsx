import React, { useState, useEffect } from 'react';
import { habitsAPI, Habit, CreateHabitRequest, UpdateHabitRequest } from '../api';
import { weeklyPlansAPI } from '../api';
import { X, Plus, Edit2, Trash2, Clock, Target, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HabitModal: React.FC<HabitModalProps> = ({ isOpen, onClose }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateHabitRequest>({
    name: '',
    default_duration: 30
  });
  const [newHabit, setNewHabit] = useState<CreateHabitRequest>({
    name: '',
    default_duration: 30,
  });

  useEffect(() => {
    if (isOpen) {
      loadHabits();
    }
  }, [isOpen]);

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
      console.log('Creating habit with data:', newHabit);
      const created = await habitsAPI.createHabit(newHabit);
      console.log('Habit created successfully:', created);
      setHabits([...habits, created]);
      setNewHabit({ name: '', default_duration: 30 });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating habit:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      // Try to get more error details
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Error response:', (error as any).response?.data);
      }
    }
  };

  const startEdit = (habit: Habit) => {
    setEditingHabit(habit.id);
    setEditForm({
      name: habit.name,
      default_duration: habit.default_duration
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit || !editForm.name?.trim()) return;

    try {
      const updated = await habitsAPI.updateHabit(editingHabit, editForm);
      setHabits(habits.map(h => h.id === editingHabit ? updated : h));
      setEditingHabit(null);
      setEditForm({ name: '', default_duration: 30 });
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  };

  const cancelEdit = () => {
    setEditingHabit(null);
    setEditForm({ name: '', default_duration: 30 });
  };

  const deleteHabit = async (id: string) => {
    try {
      // The backend now handles deleting weekly plans automatically
      // when a habit is deleted, so we just need to delete the habit itself
      await habitsAPI.deleteHabit(id);
      setHabits(habits.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
              <div className="absolute top-4 right-4">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">My Habits</h2>
                  <p className="text-white/80">Create and manage your daily habits</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <AnimatePresence mode="wait">
                {isCreating ? (
                  <motion.div
                    key="create-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-8"
                  >
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                          <Plus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-neutral-800">Add New Habit</h3>
                          <p className="text-neutral-600 text-sm">Start building a better routine</p>
                        </div>
                      </div>
                      
                      <form onSubmit={createHabit} className="space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-neutral-700 mb-2 flex items-center space-x-2">
                            <Target className="w-4 h-4" />
                            <span>Habit Name</span>
                          </label>
                          <input
                            type="text"
                            value={newHabit.name}
                            onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                            className="input-field text-lg"
                            placeholder="e.g., Morning Meditation, Read 30 minutes"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-neutral-700 mb-2 flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>Default Duration (minutes)</span>
                          </label>
                          <input
                            type="number"
                            value={newHabit.default_duration}
                            onChange={(e) => setNewHabit({ ...newHabit, default_duration: parseInt(e.target.value) || 30 })}
                            className="input-field text-lg"
                            min="1"
                            required
                          />
                        </div>
                        
                        <div className="flex space-x-4 pt-4">
                          <button
                            type="submit"
                            className="btn-primary flex-1 text-lg py-3 flex items-center justify-center space-x-2"
                          >
                            <Plus className="w-5 h-5" />
                            <span>Create Habit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreating(false);
                              setNewHabit({ name: '', default_duration: 30 });
                            }}
                            className="btn-secondary flex-1 text-lg py-3"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="add-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-8"
                  >
                    <button
                      onClick={() => setIsCreating(true)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3 group"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Plus className="w-6 h-6" />
                      </div>
                      <span>{habits.length === 0 ? 'Create Your First Habit' : 'Create Habit'}</span>
                      <Sparkles className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center py-12"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mx-auto mb-4 animate-pulse" />
                    <p className="text-neutral-600 font-medium">Loading habits...</p>
                  </div>
                </motion.div>
              ) : habits.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-24 h-24 bg-neutral-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Target className="w-12 h-12 text-neutral-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-700 mb-3">No habits yet</h3>
                  <p className="text-neutral-500 text-lg mb-6">Start building better habits today!</p>
                  <div className="inline-flex items-center space-x-2 text-sm text-neutral-600 bg-neutral-100 px-4 py-2 rounded-full">
                    <Sparkles className="w-4 h-4" />
                    <span>Create your first habit to get started</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {habits.map((habit, index) => (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-r from-white to-neutral-50 rounded-2xl border border-neutral-200 hover-lift"
                    >
                      {editingHabit === habit.id ? (
                        // Edit form
                        <div className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                              <Edit2 className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h4 className="font-semibold text-neutral-800">Edit Habit</h4>
                          </div>
                          
                          <form onSubmit={saveEdit} className="space-y-4">
                            <div className="flex space-x-4">
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="input-field flex-1"
                                placeholder="Habit name"
                                required
                              />
                              <input
                                type="number"
                                value={editForm.default_duration}
                                onChange={(e) => setEditForm({ ...editForm, default_duration: parseInt(e.target.value) || 30 })}
                                className="input-field w-32"
                                min="1"
                                required
                              />
                            </div>
                            
                            <div className="flex space-x-3">
                              <button
                                type="submit"
                                className="btn-success flex-1"
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="btn-secondary flex-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        // Normal view
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                                  <Target className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-neutral-900">{habit.name}</h3>
                                  <div className="flex items-center space-x-2 text-sm text-neutral-600">
                                    <Clock className="w-4 h-4" />
                                    <span>{habit.default_duration} minutes</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => startEdit(habit)}
                                className="p-3 hover:bg-indigo-50 rounded-xl transition-colors group"
                              >
                                <Edit2 className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                              </button>
                              <button
                                onClick={() => deleteHabit(habit.id)}
                                className="p-3 hover:bg-red-50 rounded-xl transition-colors group"
                              >
                                <Trash2 className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
