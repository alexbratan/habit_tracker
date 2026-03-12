import { apiClient } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  user_habits?: any[];
  weekly_plan?: any;
}

export interface ChatResponse {
  response: string;
  suggested_schedule?: any;
  suggested_habits?: any[];
}

export interface GenerateScheduleRequest {
  habits: any[];
  preferences?: any;
}

export interface GenerateScheduleResponse {
  schedule: string;
}

export const chatbotAPI = {
  chat: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post('/api/chatbot/chat', request);
    return response.data;
  },

  generateSchedule: async (request: GenerateScheduleRequest): Promise<GenerateScheduleResponse> => {
    const response = await apiClient.post('/api/chatbot/generate-schedule', request.habits, {
      params: request.preferences
    });
    return response.data;
  },

  createSuggestedHabits: async (habits: { name: string; default_duration: number }[]): Promise<{ message: string; habits: any[] }> => {
    const response = await apiClient.post('/api/chatbot/create-suggested-habits', habits);
    return response.data;
  }
};
