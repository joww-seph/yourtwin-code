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
  delete: (id) => api.delete(`/activities/${id}`),
  // Draft code persistence
  saveDraft: (id, code, language) => api.post(`/activities/${id}/draft`, { code, language }),
  loadDraft: (id) => api.get(`/activities/${id}/draft`),
  clearDraft: (id) => api.delete(`/activities/${id}/draft`)
};

// Submission API calls
export const submissionAPI = {
  submit: (data) => api.post('/submissions', data),
  run: (data) => api.post('/submissions/run', data), // Run tests without creating submission
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
  markComplete: (id) => api.put(`/lab-sessions/${id}/complete`),
  reopen: (id) => api.put(`/lab-sessions/${id}/reopen`),
  extend: (id, extendedEndTime) => api.put(`/lab-sessions/${id}/extend`, { extendedEndTime }),

  // Student management
  addStudents: (id, studentIds) => api.post(`/lab-sessions/${id}/students`, { studentIds }),
  removeStudent: (id, studentId) => api.delete(`/lab-sessions/${id}/students/${studentId}`),
  getAvailableStudents: (id, filters) => api.get(`/lab-sessions/${id}/available-students`, { params: filters }),

  // Resubmission control
  allowResubmission: (sessionId, studentId, activityId) =>
    api.put(`/lab-sessions/${sessionId}/resubmit/${studentId}/${activityId}`),

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
  getOne: (id) => api.get(`/students/${id}`),
  getMyProfile: () => api.get('/students/me/profile')
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

// Digital Twin API calls
export const twinAPI = {
  // Get complete Digital Twin profile
  getProfile: () => api.get('/twin/profile'),

  // Get AI dependency analysis
  getAIDependency: () => api.get('/twin/ai-dependency'),

  // Get personalized recommendations
  getRecommendations: () => api.get('/twin/recommendations'),

  // Get coding behavior analysis
  getCodingBehavior: (activityId) =>
    api.get('/twin/behavior', { params: activityId ? { activityId } : {} }),

  // Get Shadow Twin personality
  getShadowPersonality: () => api.get('/twin/shadow-personality'),

  // Get competency summary
  getCompetencies: () => api.get('/twin/competencies'),

  // Get velocity history for charts
  getVelocityHistory: () => api.get('/twin/velocity-history'),

  // Check if should encourage independence
  checkEncourageIndependence: (activityId) =>
    api.post('/twin/encourage-independence', { activityId }),

  // Adjust hint level based on profile
  adjustHintLevel: (requestedLevel, activityId) =>
    api.post('/twin/adjust-hint-level', { requestedLevel, activityId }),

  // Get post-hint feedback
  getHintFeedback: (hintLevel, wasHelpful) =>
    api.post('/twin/hint-feedback', { hintLevel, wasHelpful }),

  // Instructor: Get specific student's twin
  getStudentTwin: (studentId) => api.get(`/twin/student/${studentId}`),

  // Instructor: Get class analytics
  getClassAnalytics: (sessionId) => api.get(`/twin/class-analytics/${sessionId}`)
};

// Activity Monitoring API calls
export const monitoringAPI = {
  // Student endpoints
  start: (activityId, labSessionId) => api.post('/monitoring/start', { activityId, labSessionId }),
  recordEvent: (monitoringId, event) => api.post('/monitoring/event', { monitoringId, event }),
  recordEvents: (monitoringId, events) => api.post('/monitoring/events', { monitoringId, events }),
  end: (monitoringId, totalActiveTime) => api.post('/monitoring/end', { monitoringId, totalActiveTime }),
  getMyMonitoring: (activityId) => api.get(`/monitoring/my/${activityId}`),

  // Instructor endpoints
  getSessionMonitoring: (sessionId) => api.get(`/monitoring/session/${sessionId}`),
  getStudentActivityMonitoring: (studentId, activityId) => api.get(`/monitoring/student/${studentId}/activity/${activityId}`),
  getFlaggedStudents: (sessionId) => api.get(`/monitoring/flagged/${sessionId}`)
};

export default api;