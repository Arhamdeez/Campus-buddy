import axios from 'axios';
import { auth } from '../config/firebase';
import { getIdToken } from 'firebase/auth';

// Create axios instances for different API endpoints
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper function to get fresh Firebase ID token
const getFreshToken = async (): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Force refresh to get a new token
      const token = await getIdToken(currentUser, true);
      localStorage.setItem('campusbuddy_token', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting fresh token:', error);
    return null;
  }
};

// Auth API
export const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Main API for authenticated requests
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(
  async (config) => {
    // Try to get token from localStorage first
    let token = localStorage.getItem('campusbuddy_token');
    
    // If no token or token might be expired, get a fresh one
    if (!token || auth.currentUser) {
      token = await getFreshToken();
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration - try to refresh token once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to get a fresh token
        const token = await getFreshToken();
        
        if (token) {
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } else {
          // No valid user, redirect to login
          localStorage.removeItem('campusbuddy_token');
          window.location.href = '/login';
        }
      } catch (refreshError) {
        // Token refresh failed, redirect to login
        localStorage.removeItem('campusbuddy_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Users
  users: {
    getAll: (params?: any) => api.get('/users', { params }),
    getById: (id: string) => api.get(`/users/${id}`),
    updateProfile: (data: any) => api.put('/users/profile', data),
    getLeaderboard: (limit?: number) => api.get('/users/leaderboard/points', { params: { limit } }),
    search: (query: string, limit?: number) => api.get(`/users/search/${query}`, { params: { limit } }),
  },

  // Chat
  chat: {
    getMessages: (params?: any) => api.get('/chat/messages', { params }),
    sendMessage: (content: string) => api.post('/chat/messages', { content }),
    editMessage: (id: string, content: string) => api.put(`/chat/messages/${id}`, { content }),
    deleteMessage: (id: string) => api.delete(`/chat/messages/${id}`),
    generateSummary: (data: any) => api.post('/chat/summary', data),
    getSummaries: (limit?: number) => api.get('/chat/summaries', { params: { limit } }),
  },

  // Announcements
  announcements: {
    getAll: (params?: any) => api.get('/announcements', { params }),
    getById: (id: string) => api.get(`/announcements/${id}`),
    create: (data: any) => api.post('/announcements', data),
    update: (id: string, data: any) => api.put(`/announcements/${id}`, data),
    delete: (id: string) => api.delete(`/announcements/${id}`),
    like: (id: string) => api.post(`/announcements/${id}/like`),
  },

  // Lost & Found
  lostFound: {
    getAll: (params?: any) => api.get('/lost-found', { params }),
    getById: (id: string) => api.get(`/lost-found/${id}`),
    create: (data: any) => api.post('/lost-found', data),
    update: (id: string, data: any) => api.put(`/lost-found/${id}`, data),
    markReturned: (id: string) => api.post(`/lost-found/${id}/return`),
    delete: (id: string) => api.delete(`/lost-found/${id}`),
  },

  // Feedback
  feedback: {
    getAll: (params?: any) => api.get('/feedback', { params }),
    getById: (id: string) => api.get(`/feedback/${id}`),
    create: (data: any) => api.post('/feedback', data),
    updateStatus: (id: string, status: string) => api.put(`/feedback/${id}/status`, { status }),
    vote: (id: string, voteType: 'up' | 'down') => api.post(`/feedback/${id}/vote`, { voteType }),
    delete: (id: string) => api.delete(`/feedback/${id}`),
  },

  // Mood
  mood: {
    getEntries: (params?: any) => api.get('/mood', { params }),
    create: (mood: string) => api.post('/mood', { mood }),
    feedback: (id: string, helpful: boolean) => api.post(`/mood/${id}/feedback`, { helpful }),
    getStats: (params?: any) => api.get('/mood/stats', { params }),
    delete: (id: string) => api.delete(`/mood/${id}`),
  },

  // Campus Status
  status: {
    getAll: (params?: any) => api.get('/status', { params }),
    getById: (id: string) => api.get(`/status/${id}`),
    search: (query: string) => api.get(`/status/search/${query}`),
    create: (data: any) => api.post('/status', data),
    update: (id: string, data: any) => api.put(`/status/${id}`, data),
    delete: (id: string) => api.delete(`/status/${id}`),
    getPopularKeywords: (limit?: number) => api.get('/status/keywords/popular', { params: { limit } }),
  },

  // Badges
  badges: {
    getAll: () => api.get('/badges'),
    getUserBadges: (userId: string) => api.get(`/badges/user/${userId}`),
    create: (data: any) => api.post('/badges', data),
    award: (userId: string, badgeId: string) => api.post('/badges/award', { userId, badgeId }),
    checkAutomatic: () => api.post('/badges/check-automatic'),
    getActivities: (userId: string, limit?: number) => api.get(`/badges/activities/${userId}`, { params: { limit } }),
  },
};

export default api;
