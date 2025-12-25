import axios from 'axios';

// Determine API URL based on current host (for local network access)
const getApiUrl = () => {
  // If explicitly set via env, use that (required for tunnels)
  if (import.meta.env.VITE_API_URL) {
    console.log(`🔗 API URL (env): ${import.meta.env.VITE_API_URL}`);
    return import.meta.env.VITE_API_URL;
  }

  const host = window.location.hostname;

  // Tunnel mode - must use VITE_API_URL env variable
  if (host.includes('.trycloudflare.com') || host.includes('.loca.lt') || host.includes('.ngrok')) {
    console.error('🔗 Tunnel detected but VITE_API_URL not set! Check .env file.');
    // Return empty to show error
    return '/api';
  }

  // Local development - use same host with port 5000
  const apiUrl = `http://${host}:5000/api`;
  console.log(`🔗 API URL (local): ${apiUrl}`);
  return apiUrl;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (identifier) => api.post('/auth/forgot-password', { identifier }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password })
};

// Activity API calls
export const activityAPI = {
  getAll: (params) => api.get('/activities', { params }),
  getOne: (id) => api.get(`/activities/${id}`),
  create: (data) => api.post('/activities', data),
  update: (id, data) => api.put(`/activities/${id}`, data),
  delete: (id) => api.delete(`/activities/${id}`)
};

// Submission API calls
export const submissionAPI = {
  submit: (data) => api.post('/submissions', data),
  getMySubmissions: (activityId) => api.get(`/submissions/activity/${activityId}`),
  getAll: () => api.get('/submissions/my'),
  getOne: (id) => api.get(`/submissions/${id}`),
  compare: (id1, id2) => api.get(`/submissions/compare/${id1}/${id2}`),
  runSandbox: (data) => api.post('/submissions/sandbox', data),
  getStats: () => api.get('/submissions/stats')
};

// Lab Session API calls
export const labSessionAPI = {
  getAll: () => api.get('/lab-sessions'),
  getOne: (id) => api.get(`/lab-sessions/${id}`),
  create: (data) => api.post('/lab-sessions', data),
  update: (id, data) => api.put(`/lab-sessions/${id}`, data),
  delete: (id) => api.delete(`/lab-sessions/${id}`),
  activate: (id) => api.put(`/lab-sessions/${id}/activate`),
  deactivate: (id) => api.put(`/lab-sessions/${id}/deactivate`),

  // Student management
  addStudents: (id, studentIds) => api.post(`/lab-sessions/${id}/students`, { studentIds }),
  removeStudent: (id, studentId) => api.delete(`/lab-sessions/${id}/students/${studentId}`),
  getAvailableStudents: (id, filters) => api.get(`/lab-sessions/${id}/available-students`, { params: filters }),

  // Activities within session
  createActivity: (id, data) => api.post(`/lab-sessions/${id}/activities`, data),
  getActivities: (id) => api.get(`/lab-sessions/${id}/activities`),

  // Progress tracking (instructor only)
  getSessionProgress: (id) => api.get(`/lab-sessions/${id}/progress`),
  getActivityProgress: (sessionId, activityId) => api.get(`/lab-sessions/${sessionId}/activities/${activityId}/progress`)
};

// Student API calls
export const studentAPI = {
  search: (params) => api.get('/students/search', { params }),
  getAll: (params) => api.get('/students', { params }),
  getOne: (id) => api.get(`/students/${id}`)
};

// Analytics API calls (instructors only)
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getSessionAnalytics: (sessionId) => api.get(`/analytics/session/${sessionId}`),
  getLiveActivity: () => api.get('/analytics/live')
};

// Plagiarism Detection API calls (instructors only)
export const plagiarismAPI = {
  checkSubmission: (submissionId, threshold) =>
    api.get(`/plagiarism/submission/${submissionId}`, { params: { threshold } }),
  getActivityReport: (activityId, threshold) =>
    api.get(`/plagiarism/activity/${activityId}`, { params: { threshold } }),
  compareSubmissions: (id1, id2) =>
    api.get(`/plagiarism/compare/${id1}/${id2}`),
  getSessionReport: (sessionId, threshold) =>
    api.get(`/plagiarism/session/${sessionId}`, { params: { threshold } })
};

// AI Shadow Twin API calls
export const aiAPI = {
  // Get AI provider status (public)
  getStatus: () => api.get('/ai/status'),

  // Request a hint
  requestHint: (data) => api.post('/ai/hint', data),

  // Submit comprehension check answer
  submitComprehension: (data) => api.post('/ai/comprehension', data),

  // Get hint history for an activity
  getHintHistory: (activityId) => api.get(`/ai/hints/${activityId}`),

  // Submit feedback on a hint
  submitFeedback: (hintId, wasHelpful) => api.post(`/ai/hints/${hintId}/feedback`, { wasHelpful }),

  // Get recommended hint level
  getRecommendedLevel: (activityId, params) => api.get(`/ai/recommend-level/${activityId}`, { params }),

  // Get usage stats (instructors only)
  getUsageStats: (params) => api.get('/ai/usage', { params })
};

export default api;