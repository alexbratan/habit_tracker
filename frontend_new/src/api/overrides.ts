import apiClient from './client';

export interface OverrideUpsert {
  weeklyPlanId: string;
  date: string;
  status?: 'planned' | 'done' | 'skipped';
  plannedDuration?: number;
  actualDuration?: number;
}

export interface OverrideResponse {
  id: string;
  weeklyPlanId: string;
  date: string;
  status: 'planned' | 'done' | 'skipped';
  plannedDuration?: number;
  actualDuration?: number;
  created_at: string;
  updated_at: string;
}

export const overridesAPI = {
  upsertOverride: async (data: OverrideUpsert): Promise<OverrideResponse> => {
    const response = await apiClient.patch('/overrides', data);
    return response.data;
  },

  getOverrides: async (date?: string): Promise<OverrideResponse[]> => {
    const params = date ? `?date=${date}` : '';
    const response = await apiClient.get(`/overrides${params}`);
    return response.data;
  },

  deleteOverride: async (weeklyPlanId: string, date: string): Promise<void> => {
    await apiClient.delete(`/overrides/${weeklyPlanId}/${date}`);
  },
};
