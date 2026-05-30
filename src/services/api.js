import axios from 'axios';

const API_BASE_URL = 'https://api-graph.tests.grupoapok.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const nodeService = {
  getParentNodes: async () => {
    const response = await api.get('/nodes');
    return response.data;
  },
  getChildNodes: async (parentId) => {
    const response = await api.get(`/nodes?parent=${parentId}`);
    return response.data;
  },
  createNode: async (nodeData) => {
    const response = await api.post('/node', nodeData);
    return response.data;
  },
  deleteNode: async (id) => {
    const response = await api.delete(`/node/${id}`);
    return response.data;
  },
  getLocales: async () => {
    const response = await api.get('/locales');
    return response.data;
  }
};