import apiClient from './client';

export interface WeeklyPlan {
  id: number;
  week_start: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  id: number;
  weekly_plan_id: number;
  title: string;
  description?: string;
  target_date?: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWeeklyPlanRequest {
  week_start: string;
}

export interface CreatePlanItemRequest {
  title: string;
  description?: string;
  target_date?: string;
}

export const weeklyAPI = {
  getWeeklyPlans: async (): Promise<WeeklyPlan[]> => {
    const response = await apiClient.get('/weekly-plans');
    return response.data;
  },

  getWeeklyPlan: async (id: number): Promise<WeeklyPlan> => {
    const response = await apiClient.get(`/weekly-plans/${id}`);
    return response.data;
  },

  createWeeklyPlan: async (data: CreateWeeklyPlanRequest): Promise<WeeklyPlan> => {
    const response = await apiClient.post('/weekly-plans', data);
    return response.data;
  },

  getPlanItems: async (weeklyPlanId: number): Promise<PlanItem[]> => {
    const response = await apiClient.get(`/weekly-plans/${weeklyPlanId}/items`);
    return response.data;
  },

  createPlanItem: async (weeklyPlanId: number, data: CreatePlanItemRequest): Promise<PlanItem> => {
    const response = await apiClient.post(`/weekly-plans/${weeklyPlanId}/items`, data);
    return response.data;
  },

  updatePlanItem: async (itemId: number, data: Partial<CreatePlanItemRequest>): Promise<PlanItem> => {
    const response = await apiClient.put(`/plan-items/${itemId}`, data);
    return response.data;
  },

  deletePlanItem: async (itemId: number): Promise<void> => {
    await apiClient.delete(`/plan-items/${itemId}`);
  },

  togglePlanItem: async (itemId: number): Promise<PlanItem> => {
    const response = await apiClient.patch(`/plan-items/${itemId}/toggle`);
    return response.data;
  },
};
