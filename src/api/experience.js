import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 5000,
})

request.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('feishu_session_token')
  if (token) {
    config.headers['X-Feishu-Token'] = token
  }
  return config
})

export function getFeishuAuthConfig() {
  return request.get('/api/feishu-auth/config')
}

export function loginByFeishuCode(code) {
  return request.post('/api/feishu-auth/login', { code })
}

export function getCurrentFeishuUser() {
  return request.get('/api/feishu-auth/me')
}

export function getExperienceList(keyword, projectName) {
  return request.get('/api/experience/list', {
    params: typeof keyword === 'object' ? keyword : { keyword, projectName },
  })
}

export function getProjectNameList() {
  return request.get('/api/experience/projectNames')
}

export function getFilterOptions() {
  return request.get('/api/experience/filterOptions')
}

export function getExperienceById(id) {
  return request.get(`/api/experience/get/${id}`)
}

export function getExperienceDetail(id) {
  return request.get(`/api/experience/detail/${id}`)
}

export function getExperienceRecordList(experienceId) {
  return request.get(`/api/experience/records/${experienceId}`)
}

export function getExperienceAdoptRecordList(experienceId) {
  return request.get(`/api/experience/adoptRecords/${experienceId}`)
}

export function getDashboardData() {
  return request.get('/api/experience/dashboard')
}

export function addExperience(data) {
  return request.post('/api/experience/add', data)
}

export function updateExperience(data) {
  return request.put('/api/experience/update', data)
}

export function analyzeExperience(data) {
  return request.post('/api/experience/analyze', data)
}

export function getReuseRecommendList(id) {
  return request.get(`/api/experience/recommend/${id}`)
}

export function getActionPlan(id) {
  return request.get(`/api/experience/actionPlan/${id}`)
}

export function generateProjectPlaybook(data) {
  return request.post('/api/experience/playbook/generate', data)
}

export function saveProjectPlaybook(data) {
  return request.post('/api/experience/playbook/save', data)
}

export function getProjectPlaybookList() {
  return request.get('/api/experience/playbook/list')
}

export function deleteProjectPlaybook(id) {
  return request.delete(`/api/experience/playbook/delete/${id}`)
}

export function askLocalAi(data) {
  return request.post('/api/local-ai/ask', data)
}

export function getLocalAiHistory() {
  return request.get('/api/local-ai/history')
}

export function getFeishuStatus() {
  return request.get('/api/feishu/status')
}

export function saveFeishuConfig(data) {
  return request.post('/api/feishu/config', data)
}

export function sendFeishuTest() {
  return request.post('/api/feishu/test')
}

export function pushFeishuMessage(data) {
  return request.post('/api/feishu/push', data)
}

export function getFeishuHistory() {
  return request.get('/api/feishu/history')
}

export function adoptExperience(data) {
  return request.post('/api/experience/adopt', data)
}

export function deleteExperience(id) {
  return request.delete(`/api/experience/delete/${id}`)
}
