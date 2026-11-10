export type UserRole = 'Student' | 'Faculty' | 'Advisor'

export type ApiProgress = {
  attendance?: number | null
  gpa?: number | null
  skills?: number | null
  streak?: number | null
  subject?: string | null
  achievement?: string | null
  wellbeing?: string | null
  notes?: string | null
}

export type ApiUser = {
  id: number
  name: string
  email: string
  role: UserRole
  reg: string | null
  course: string | null
  department: string | null
  year: string | null
  section: string | null
  subjects: string[]
  interests: string[]
  details: string | null
  employee_id: string | null
  is_demo: boolean
  progress?: ApiProgress
}

export type ProgressHistoryRecord = ApiProgress & {
  recorded_at: string
}

export type ImportResult = {
  successful: number
  created: number
  updated: number
  failed: number
  failures: { row: number; errors: string[] }[]
  activations: { email: string; code: string }[]
}

type ProgressUpdate = {
  email: string
  attendance: number
  gpa: number
  skills: number
  streak: number
  subject: string
  achievement: string
  wellbeing: string
  notes: string
}

type ReportAudit = { generated_by: string; student_email: string; created_at: string }

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = window.localStorage.getItem('student-thrive-auth-token')
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  } catch {
    throw new Error('Student Thrive service is temporarily unavailable. Please try again.')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    if (response.ok) throw new Error('Student Thrive returned an invalid response. Please try again.')
  }
  if (response.ok && (body === null || typeof body !== 'object' || Array.isArray(body))) {
    throw new Error('Student Thrive returned an invalid response. Please try again.')
  }
  const detail = body !== null && typeof body === 'object' && !Array.isArray(body) && 'detail' in body
    ? body.detail
    : undefined
  if (!response.ok) {
    if (response.status === 401) {
      window.localStorage.removeItem('student-thrive-auth-token')
      window.dispatchEvent(new CustomEvent('student-thrive-auth-expired'))
      throw new Error('Your session has expired. Please sign in again.')
    }
    if (response.status >= 500) {
      throw new Error('Student Thrive service is temporarily unavailable. Please try again.')
    }
    if (response.status === 403) {
      throw new Error('Your account does not have permission to complete that action.')
    }
    if (response.status === 429) {
      throw new Error('There have been too many attempts. Please wait a moment and try again.')
    }
    if (response.status === 422 || Array.isArray(detail)) {
      throw new Error('Check the information provided and try again.')
    }
    if (typeof detail === 'string') throw new Error(detail)
    throw new Error('Request failed. Check your information and try again.')
  }
  return body as T
}

export const api = {
  getMe: () => request<{ user: ApiUser }>('/me'),
  listStudents: () => request<{ students: ApiUser[] }>('/students'),
  getProgressHistory: (email: string) =>
    request<{ history: ProgressHistoryRecord[] }>(`/students/${encodeURIComponent(email)}/progress/history`),
  getReportHistory: (email: string) =>
    request<{ history: ReportAudit[] }>(`/reports/history?student_email=${encodeURIComponent(email)}`),
  saveProgress: (progress: ProgressUpdate) =>
    request<{ message: string; progress: ApiProgress }>('/progress', {
      method: 'POST',
      body: JSON.stringify(progress),
    }),
  register: (profile: Record<string, unknown>) =>
    request<{ message: string; user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),
  activate: (credentials: { email: string; code: string; password: string }) =>
    request<{ message: string }>('/auth/activate', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  login: (credentials: { email: string; password: string; role: UserRole }) =>
    request<{ user: ApiUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  generateReport: (email: string, role: UserRole) =>
    request<{ filename: string; content: string }>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  askAssistant: (message: string, studentEmail?: string) =>
    request<{ answer: string; source: string }>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, student_email: studentEmail }),
    }),
  importStudents: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<ImportResult>('/students/import', { method: 'POST', body })
  },
}
