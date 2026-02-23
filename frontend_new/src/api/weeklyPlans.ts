import apiClient from './client';

export interface WeeklyPlan {
  id: string;
  habitId: string;
  weekday: number; // 0=Monday, 6=Sunday
  plannedDuration: number; // in minutes
  created_at: string;
  user_id: string;
}

export interface CreateWeeklyPlanRequest {
  habitId: string;
  weekday: number;
  plannedDuration: number;
}

export interface UpdateWeeklyPlanRequest {
  plannedDuration: number;
}

export const weeklyPlansAPI = {
  getWeeklyPlans: async (): Promise<WeeklyPlan[]> => {
    const response = await apiClient.get('/weekly-plans');
    return response.data;
  },

  createWeeklyPlan: async (data: CreateWeeklyPlanRequest): Promise<WeeklyPlan> => {
    const response = await apiClient.post('/weekly-plans', data);
    return response.data;
  },

  updateWeeklyPlan: async (id: string, data: UpdateWeeklyPlanRequest): Promise<WeeklyPlan> => {
    const response = await apiClient.patch(`/weekly-plans/${id}`, data);
    return response.data;
  },

  deleteWeeklyPlan: async (id: string): Promise<void> => {
    await apiClient.delete(`/weekly-plans/${id}`);
  },
};
