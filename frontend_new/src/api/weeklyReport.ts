import apiClient from './client';

export interface DailyStats {
  date: string;
  weekday: number;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  completionPercentage: number;
  is100PercentComplete: boolean;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalDays: number;
  daysAt100Percent: number;
  averageDailyCompletion: number;
  dailyStats: DailyStats[];
}

export const weeklyReportAPI = {
  getWeeklyReport: async (date?: string): Promise<WeeklyReport> => {
    const url = date ? `/weekly-report?date=${date}` : '/weekly-report';
    const response = await apiClient.get(url);
    return response.data;
  },
};
