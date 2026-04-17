import axios from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Request interceptor: attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spei_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('spei_token')
      localStorage.removeItem('spei_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadResume: (formData) =>
    api.post('/auth/profile/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getGoogleAuthUrl: () => api.get('/auth/google/url')
}

// ─── EMAILS ──────────────────────────────────────────────────────────────────

export const emailAPI = {
  sync: () => api.get('/emails/sync'),
  getStats: () => api.get('/emails/stats'),
  clear: () => api.delete('/emails/clear'),
  getAll: (params) => api.get('/emails', { params }),
  getById: (id) => api.get(`/emails/${id}`),
  reprocess: (id) => api.post(`/emails/${id}/reprocess`)
}

// ─── OPPORTUNITIES ────────────────────────────────────────────────────────────

export const opportunityAPI = {
  getStats: () => api.get('/opportunities/stats'),
  getDeadlines: (params) => api.get('/opportunities/deadlines', { params }),
  getRecommended: () => api.get('/opportunities/recommended'),
  getAll: (params) => api.get('/opportunities', { params }),
  getById: (id) => api.get(`/opportunities/${id}`),
  optIn: (id) => api.put(`/opportunities/${id}/optin`),
  updateStatus: (id, applicationStatus) =>
    api.put(`/opportunities/${id}/status`, { applicationStatus }),
  rematchAll: () => api.post('/opportunities/rematch-all'),
  rematchOne: (id) => api.put(`/opportunities/${id}/rematch`)
}

// ─── COMMUNITY ───────────────────────────────────────────────────────────────

export const communityAPI = {
  getSuggestions: () => api.get('/community/suggestions'),
  getDMConversation: (userId, params) =>
    api.get(`/community/dm/${userId}`, { params }),
  sendDM: (userId, data) => api.post(`/community/dm/${userId}`, data),
  getAll: () => api.get('/community'),
  create: (data) => api.post('/community', data),
  getById: (id) => api.get(`/community/${id}`),
  getMessages: (id, params) => api.get(`/community/${id}/messages`, { params }),
  sendMessage: (id, formData) =>
    api.post(`/community/${id}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  sendTextMessage: (id, data) => api.post(`/community/${id}/messages`, data),
  join: (id) => api.post(`/community/${id}/join`),
  leave: (id) => api.post(`/community/${id}/leave`),
  pinMessage: (id, messageId) => api.post(`/community/${id}/pin/${messageId}`)
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAllAsRead: () => api.put('/notifications/read-all'),
  markOneAsRead: (id) => api.put(`/notifications/${id}/read`)
}
export const settingsAPI = {
    get:                 ()     => api.get('/settings'),
    changePassword:      (data) => api.put('/settings/password', data),
    updateContact:       (data) => api.put('/settings/contact', data),
    updateNotifications: (data) => api.put('/settings/notifications', data),
    disconnectGmail:     ()     => api.post('/settings/gmail/disconnect'),
    deleteAccount:       (data) => api.delete('/settings/account', { data })
  }
  
export default api
