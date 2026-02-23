import apiClient from './client';

export interface DayActionRequest {
  date: string;
  action: 'reset' | 'skip' | 'done';
}

export const dayActionsAPI = {
  performDayAction: async (data: DayActionRequest): Promise<any> => {
    const response = await apiClient.post('/day-actions', data);
    return response.data;
  },
};
