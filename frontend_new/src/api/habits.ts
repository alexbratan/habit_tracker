import apiClient from './client';

export interface Habit {
  id: string;
  name: string;
  default_duration: number;
  created_at: string;
  user_id: string;
}

export interface CreateHabitRequest {
  name: string;
  default_duration: number;
}

export interface UpdateHabitRequest {
  name?: string;
  default_duration?: number;
}

export const habitsAPI = {
  getHabits: async (): Promise<Habit[]> => {
    const response = await apiClient.get('/habits');
    return response.data;
  },

  createHabit: async (data: CreateHabitRequest): Promise<Habit> => {
    const response = await apiClient.post('/habits', data);
    return response.data;
  },

  updateHabit: async (id: string, data: UpdateHabitRequest): Promise<Habit> => {
    const response = await apiClient.put(`/habits/${id}`, data);
    return response.data;
  },

  deleteHabit: async (id: string): Promise<void> => {
    await apiClient.delete(`/habits/${id}`);
  },
};
