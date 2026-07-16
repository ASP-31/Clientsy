const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const headers = {
    ...options.headers
  };
  
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  } else if (!options.body) {
    headers['Content-Type'] = 'application/json';
  }

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

// Authentication API
const authAPI = {
  login: (email, password) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (name, email, password, role = 'developer') => apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role })
  }),
  getMe: () => apiFetch('/auth/me')
};

// Client API
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

// Document API
const documentAPI = {
  getAll: () => apiFetch('/documents'),
  getById: (id) => apiFetch(`/documents/${id}`),
  create: (data) => apiFetch('/documents', {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data)
  }),
  update: (id, data) => apiFetch(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/documents/${id}`, {
    method: 'DELETE'
  })
};

// Project API
const projectAPI = {
  getAll: () => apiFetch('/projects'),
  getById: (id) => apiFetch(`/projects/${id}`),
  create: (data) => apiFetch('/projects', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiFetch(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/projects/${id}`, {
    method: 'DELETE'
  })
};

// Invoice API
const invoiceAPI = {
  getAll: () => apiFetch('/invoices'),
  getById: (id) => apiFetch(`/invoices/${id}`),
  create: (data) => apiFetch('/invoices', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiFetch(`/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/invoices/${id}`, {
    method: 'DELETE'
  })
};

// Proposal API
const proposalAPI = {
  getAll: () => apiFetch('/proposals'),
  getById: (id) => apiFetch(`/proposals/${id}`),
  create: (data) => apiFetch('/proposals', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiFetch(`/proposals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/proposals/${id}`, {
    method: 'DELETE'
  })
};

// Intake Form API
const intakeAPI = {
  getAll: () => apiFetch('/intakes'),
  getById: (id) => apiFetch(`/intakes/${id}`),
  create: (data) => apiFetch('/intakes', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiFetch(`/intakes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/intakes/${id}`, {
    method: 'DELETE'
  }),
  getPublic: (token) => apiFetch(`/public/intake/${token}`),
  submitPublic: (token, answers) => apiFetch(`/public/intake/${token}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  })
};

// Meetings API
const meetingAPI = {
  getAll: () => apiFetch('/meetings'),
  create: (data) => apiFetch('/meetings', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/meetings/${id}`, {
    method: 'DELETE'
  })
};

// Reviews API
const reviewAPI = {
  getAll: () => apiFetch('/reviews'),
  create: (data) => apiFetch('/reviews', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getPublicForUser: (userId) => apiFetch(`/public/reviews/${userId}`),
  submitPublicReview: (clientId, projectId, rating, feedback) => apiFetch(`/public/reviews/${clientId}/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ rating, feedback })
  })
};

// Team API
const teamAPI = {
  getAll: () => apiFetch('/team'),
  create: (data) => apiFetch('/team', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiFetch(`/team/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiFetch(`/team/${id}`, {
    method: 'DELETE'
  }),
  recordPayment: (id, amount, date, notes) => apiFetch(`/team/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify({ amount, date, notes })
  })
};

// Portal API (Clients Portal View)
const portalAPI = {
  getDashboard: () => apiFetch('/portal/dashboard'),
  signProposal: (id, signatureData, signedBy) => apiFetch(`/portal/proposals/${id}/sign`, {
    method: 'POST',
    body: JSON.stringify({ signatureData, signedBy })
  }),
  payInvoice: (id) => apiFetch(`/portal/invoices/${id}/pay`, {
    method: 'POST',
  })
};

// Expose APIs
window.authAPI = authAPI;
window.clientAPI = clientAPI;
window.documentAPI = documentAPI;
window.projectAPI = projectAPI;
window.invoiceAPI = invoiceAPI;
window.proposalAPI = proposalAPI;
window.intakeAPI = intakeAPI;
window.meetingAPI = meetingAPI;
window.reviewAPI = reviewAPI;
window.teamAPI = teamAPI;
window.portalAPI = portalAPI;
