import apiClient from './client';

export interface DailyProgress {
  date: string;
  completion_percentage: number;
  total_habits: number;
  completed_habits: number;
}

export interface StreakResponse {
  current_streak: number;
  best_streak: number;
}

export interface DailyProgressHistoryResponse {
  history: DailyProgress[];
}

export const dailyProgressAPI = {
  getStreak: async (): Promise<StreakResponse> => {
    const response = await apiClient.get('/daily-progress/streak');
    return response.data;
  },

  getDailyHistory: async (days: number = 30): Promise<DailyProgressHistoryResponse> => {
    const response = await apiClient.get(`/daily-progress/history?days=${days}`);
    return response.data;
  },
};
