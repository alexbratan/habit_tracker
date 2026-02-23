import apiClient from './client';

export interface WeekViewItem {
  weeklyPlanId: string;
  overrideId: string | null;
  date: string;
  weekday: number;
  habitId: string;
  habitName: string;
  status: 'planned' | 'done' | 'skipped';
  plannedDuration: number;
  actualDuration?: number;
  note?: string | null;
  source: string;
  isOverride?: boolean; // Computed from overrideId
}

export interface DayData {
  date: string;
  weekday: number;
  totalPlannedMinutes: number;
  counts: {
    planned: number;
    done: number;
    skipped: number;
  };
  items: WeekViewItem[];
}

export interface WeekViewResponse {
  weekStart: string;
  weekEnd: string;
  days: {
    [key: string]: DayData; // "0", "1", "2", etc.
  };
}

export const weekViewAPI = {
  getWeekView: async (start?: string): Promise<WeekViewResponse> => {
    const params = start ? `?start=${start}` : '';
    const response = await apiClient.get(`/week-view${params}`);
    return response.data;
  },
};
