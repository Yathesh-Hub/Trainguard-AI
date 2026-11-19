import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trainguard_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Handle Authentication Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('trainguard_token')
        localStorage.removeItem('trainguard_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
}

export const centresApi = {
  list: (params) => api.get('/centres', { params }),
  get: (id) => api.get(`/centres/${id}`),
  create: (data) => api.post('/centres', data),
  update: (id, data) => api.put(`/centres/${id}`, data),
  delete: (id) => api.delete(`/centres/${id}`),
}

export const studentsApi = {
  list: (params) => api.get('/students', { params }),
  get: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  import: (formData) => api.post('/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

export const trainersApi = {
  list: (params) => api.get('/trainers', { params }),
  get: (id) => api.get(`/trainers/${id}`),
  create: (data) => api.post('/trainers', data),
  update: (id, data) => api.put(`/trainers/${id}`, data),
  delete: (id) => api.delete(`/trainers/${id}`),
  analytics: (params) => api.get('/trainers/analytics', { params }),
}

export const attendanceApi = {
  upload: (formData) => api.post('/attendance/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  list: (params) => api.get('/attendance', { params }),
  analytics: (params) => api.get('/attendance/analytics', { params }),
  getStudent: (studentId) => api.get(`/attendance/student/${studentId}`),
}

export const infrastructureApi = {
  upload: (formData) => api.post('/infrastructure/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  listInspections: (params) => api.get('/infrastructure/inspections', { params }),
  getRequirements: () => api.get('/infrastructure/requirements'),
  verifyFinding: (findingId, data) => api.post(`/infrastructure/verify/${findingId}`, data),
}

export const anomaliesApi = {
  list: (params) => api.get('/anomalies', { params }),
  updateStatus: (id, data) => api.put(`/anomalies/${id}/status`, data),
}

export const complianceApi = {
  getOverview: () => api.get('/compliance/overview'),
  getCentre: (centreId) => api.get(`/compliance/centre/${centreId}`),
  recalculate: (data) => api.post('/compliance/recalculate', data),
}

export const reportsApi = {
  getCentreReport: (centreId) => api.get(`/reports/centre/${centreId}`),
  getAttendanceReport: (params) => api.get('/reports/attendance', { params }),
  getMonthlyReport: (params) => api.get('/reports/monthly', { params }),
}

export default api
