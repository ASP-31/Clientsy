const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // Get token from storage
  const token = localStorage.getItem('token');
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Inject Auth header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    
    // Auto-logout on 401 Unauthorized
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      localStorage.removeItem('token');
      if (typeof window.handleTokenExpired === 'function') {
        window.handleTokenExpired();
      }
      throw new Error('Session expired. Please log in again.');
    }

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP error! Status: ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error(`API Error in ${endpoint}:`, error);
    throw error;
  }
}

// Authentication API Methods
const authAPI = {
  login: (email, password) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (name, email, password) => apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  }),
  getMe: () => apiFetch('/auth/me')
};

// Client API Methods
const clientAPI = {
  getAll: () => apiFetch('/clients'),
  getById: (id) => apiFetch(`/clients/${id}`),
  create: (data) => apiFetch('/clients', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiFetch(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/clients/${id}`, {
    method: 'DELETE'
  })
};

// Document API Methods
const documentAPI = {
  getAll: () => apiFetch('/documents'),
  getById: (id) => apiFetch(`/documents/${id}`),
  create: (data) => apiFetch('/documents', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiFetch(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/documents/${id}`, {
    method: 'DELETE'
  })
};

// Expose APIs to window
window.authAPI = authAPI;
window.clientAPI = clientAPI;
window.documentAPI = documentAPI;
