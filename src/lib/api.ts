import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuth.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = useAuth.getState().refreshToken;
      
      if (refreshToken) {
        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { tokens } = response.data;
          
          // Update tokens in store
          const { user } = useAuth.getState();
          if (user) {
            useAuth.getState().login(tokens, user);
          }
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuth.getState().logout();
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }
      } else {
        // No refresh token, logout user
        useAuth.getState().logout();
        window.location.href = '/login';
      }
    }
    
    // Handle other errors
    if (error.response?.data?.error) {
      // Don't show error toast for 401s (handled above)
      if (error.response.status !== 401) {
        toast.error(error.response.data.error);
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/me'),
};

export const kbApi = {
  search: (params: any) => api.get('/kb', { params }),
  getArticle: (id: string) => api.get(`/kb/${id}`),
  createArticle: (data: any) => api.post('/kb', data),
  updateArticle: (id: string, data: any) => api.put(`/kb/${id}`, data),
  deleteArticle: (id: string) => api.delete(`/kb/${id}`),
  markHelpful: (id: string) => api.post(`/kb/${id}/helpful`),
};

export const ticketApi = {
  getTickets: (params: any) => api.get('/tickets', { params }),
  getTicket: (id: string) => api.get(`/tickets/${id}`),
  createTicket: (data: any) => api.post('/tickets', data),
  replyToTicket: (id: string, data: any) => api.post(`/tickets/${id}/reply`, data),
  assignTicket: (id: string, data: any) => api.post(`/tickets/${id}/assign`, data),
  getAuditLogs: (id: string) => api.get(`/tickets/${id}/audit`),
};

export const agentApi = {
  manualTriage: (ticketId: string) => api.post('/agent/triage', { ticketId }),
  getSuggestion: (ticketId: string) => api.get(`/agent/suggestion/${ticketId}`),
  approveSuggestion: (id: string, data: any) => api.post(`/agent/suggestion/${id}/approve`, data),
  getStats: (params: any) => api.get('/agent/stats', { params }),
};

export const configApi = {
  getConfig: () => api.get('/config'),
  updateConfig: (data: any) => api.put('/config', data),
  resetConfig: () => api.post('/config/reset'),
};

export default api;