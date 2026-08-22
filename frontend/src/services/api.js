import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL, timeout: 20000 });

export const checkBackendHealth = async () => (await api.get('/health')).data;
export const fetchOverview = async (country) => (await api.get('/analytics/overview', { params: country ? { country } : {} })).data;
export const fetchPriorities = async (params = {}) => (await api.get('/priorities', { params })).data;
export const fetchPriorityById = async (id) => (await api.get(`/priorities/${id}`)).data;
export const createRequest = async (payload) => (await api.post('/requests', payload)).data;
export const createCitizenRequest = async (payload) => {
  const response = await api.post('/citizen-requests', payload);
  return response.data;
};
export const fetchCountries = async () => (await api.get('/countries')).data;
export const getRequests = async (params = {}) => (await api.get('/requests', { params })).data;
export const analyzeRequest = async (requestId) => (await api.post('/requests/analyze', { requestId })).data;
export const submitMessagingRequest = async (payload) => (await api.post('/messaging/webhook', payload)).data;
export const fetchCountrySummary = async (countryCode) => (await api.get(`/country-data/${countryCode}/summary`)).data;
// GET /api/analytics/hotspots — used by the geographic hotspot map.
// limit=100 (the backend's max) so we get every district-sector combo, not
// just the top few, and can find each district's single highest sector.
export const fetchHotspots = async (limit = 100, country) => (await api.get('/analytics/hotspots', { params: { limit, ...(country ? { country } : {}) } })).data;

export const submitCitizenRequest = createRequest;
export const triggerAnalyticsRecalculation = async () => {
  const response = await api.post('/analytics/calculate');
  return response.data;
};

export default api;