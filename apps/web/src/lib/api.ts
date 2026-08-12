import axios from 'axios'

const BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? '/api')
    : (process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api')

export const api = axios.create({ baseURL: BASE, withCredentials: true })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      const cookieToken = (() => {
        const match = document.cookie.match(/(^|; )access_token=([^;]*)/)
        return match ? decodeURIComponent(match[2]) : null
      })()
      if (cookieToken) {
        config.headers.Authorization = `Bearer ${cookieToken}`
      }
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const isAuthEndpoint =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/2fa/verify')
    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      let refreshToken: string | null = null
      if (typeof window !== 'undefined') {
        refreshToken = localStorage.getItem('refresh_token')
      }
      if (!refreshToken) {
        window.location.href = '/login'
        return Promise.reject(err)
      }
      try {
        const { data } = await axios.post(`/api/auth/refresh`, { refreshToken })
        localStorage.setItem('access_token', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  verifyTotp: (tempToken: string, code: string) =>
    api.post('/auth/2fa/verify', { tempToken, code }).then((r) => r.data),
  register: (data: any) => api.post('/auth/register', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  logout: (refreshToken?: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),
  generateTotp: () => api.get('/auth/2fa/generate').then((r) => r.data),
  enableTotp: (code: string) =>
    api.post('/auth/2fa/enable', { code }).then((r) => r.data),
}

export const usersApi = {
  list: (page = 1, limit = 20) =>
    api.get(`/users?page=${page}&limit=${limit}`).then((r) => r.data),
  get: (id: string) => api.get(`/users/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/users', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/users/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/users/${id}`),
  assignRoles: (id: string, roleIds: string[]) =>
    api.put(`/users/${id}/roles`, { roleIds }).then((r) => r.data),
}

export const rolesApi = {
  list: () => api.get('/roles').then((r) => r.data),
  get: (id: string) => api.get(`/roles/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/roles', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put(`/roles/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  assignPermissions: (id: string, permissionIds: string[]) =>
    api.put(`/roles/${id}/permissions`, { permissionIds }).then((r) => r.data),
}

export const permissionsApi = {
  list: () => api.get('/permissions').then((r) => r.data),
}
