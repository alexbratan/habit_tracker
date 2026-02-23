import apiClient from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const formData = new FormData();
    formData.append('username', data.email);
    formData.append('password', data.password);
    
    const response = await apiClient.post('/users/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // Get user info after successful login
    const userResponse = await apiClient.get('/users/me', {
      headers: {
        'Authorization': `Bearer ${response.data.access_token}`,
      },
    });
    
    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      user: userResponse.data,
    };
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/users', data);
    
    // Auto-login after registration
    const loginResponse = await authAPI.login({ email: data.email, password: data.password });
    return loginResponse;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },
};
