// src/services/api.js
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
  // Obtener los nodos raíces principales
  getParentNodes: async () => {
    const response = await api.get('/nodes');
    return response.data;
  },

  // Obtener los nodos hijos de un padre específico
  getChildNodes: async (parentId) => {
    const response = await api.get('/nodes', {
      params: {
        parent: parentId
      }
    });
    return response.data;
  },

  // Crear un nuevo nodo
  createNode: async (nodeData) => {
    const response = await api.post('/node', nodeData);
    return response.data;
  },

  // Eliminar un nodo por su ID
  deleteNode: async (id) => {
    const response = await api.delete(`/node/${id}`);
    return response.data;
  },
};