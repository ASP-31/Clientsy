// --- App State Store ---
const state = {
  clients: [],
  documents: [],
  activeTab: 'dashboard',
  selectedClientId: null,
  uploadedFileBase64: null,
  uploadedFileType: null,
  uploadedFileSize: 0
};

// --- DOM References ---
const DOM = {
  // Navigation
  navLinks: document.querySelectorAll('.nav-link'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  viewAllButtons: document.querySelectorAll('.btn-view-all'),
  
  // Search
  globalSearch: document.getElementById('global-search'),
  
  // Dashboard Stats
  statClients: document.getElementById('stat-total-clients'),
  statDocs: document.getElementById('stat-total-docs'),
  statContracts: document.getElementById('stat-active-contracts'),
  statInvoices: document.getElementById('stat-total-invoices'),
  recentClientsTable: document.getElementById('recent-clients-table').querySelector('tbody'),
  recentDocsTable: document.getElementById('recent-docs-table').querySelector('tbody'),
  categoryList: document.getElementById('category-distribution-list'),

  // Clients Tab
  clientSearch: document.getElementById('client-search'),
  clientsList: document.getElementById('clients-list-container'),
  clientDetailPane: document.getElementById('client-detail-pane'),
  addClientTabBtn: document.getElementById('add-client-tab-btn'),
  quickAddClientBtn: document.getElementById('quick-add-client-btn'),

  // Documents Tab
  docSearch: document.getElementById('doc-search'),
  docFilterClient: document.getElementById('doc-filter-client'),
  docFilterCategory: document.getElementById('doc-filter-category'),
  documentsGrid: document.getElementById('documents-grid-container'),
  uploadDocTabBtn: document.getElementById('upload-doc-tab-btn'),
  quickUploadDocBtn: document.getElementById('quick-upload-doc-btn'),

  // Modals
  clientModal: document.getElementById('client-modal'),
  clientForm: document.getElementById('client-form'),
  clientModalTitle: document.getElementById('client-modal-title'),
  clientModalSubmit: document.getElementById('client-modal-submit'),
  clientCancel: document.getElementById('client-modal-cancel'),
  clientClose: document.getElementById('client-modal-close'),

  documentModal: document.getElementById('document-modal'),
  documentForm: document.getElementById('document-form'),
  docClientSelect: document.getElementById('doc-client'),
  fileDropZone: document.getElementById('file-drop-zone'),
  fileInput: document.getElementById('doc-file-input'),
  selectedFileDetails: document.getElementById('selected-file-details'),
  selectedFileName: document.getElementById('selected-file-name'),
  selectedFileSize: document.getElementById('selected-file-size'),
  btnRemoveSelectedFile: document.getElementById('btn-remove-selected-file'),
  docCancel: document.getElementById('document-modal-cancel'),
  docClose: document.getElementById('document-modal-close'),

  previewModal: document.getElementById('preview-modal'),
  previewTitle: document.getElementById('preview-title'),
  previewClient: document.getElementById('preview-client'),
  previewCategory: document.getElementById('preview-category'),
  previewDetails: document.getElementById('preview-details'),
  previewDate: document.getElementById('preview-date'),
  previewVisibility: document.getElementById('preview-visibility'),
  previewDesc: document.getElementById('preview-desc'),
  previewTags: document.getElementById('preview-tags'),
  previewViewer: document.getElementById('preview-viewer-container'),
  previewDownloadBtn: document.getElementById('preview-download-btn'),
  previewClose: document.getElementById('preview-modal-close'),

  toastContainer: document.getElementById('toast-container')
};

// --- Initializer ---
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadData();
  renderAll();
});

// --- API Data Fetching ---
async function loadData() {
  try {
    const clientsRes = await window.clientAPI.getAll();
    state.clients = clientsRes.data || [];
  } catch (err) {
    showToast('Failed to load clients data.', 'error');
  }

  try {
    const docsRes = await window.documentAPI.getAll();
    state.documents = docsRes.data || [];
  } catch (err) {
    showToast('Failed to load documents data.', 'error');
  }
}

// --- Dynamic Rendering Pipelines ---
function renderAll() {
  // Sync client select option dropdowns
  populateClientSelects();

  // Render state-specific sections
  renderDashboard();
  renderClientsList();
  renderClientDetails();
  renderDocumentsGrid();

  // Refresh icons
  lucide.createIcons();
}

// 1. Populate Client Select Elements
function populateClientSelects() {
  const defaultOption = '<option value="all">All Clients</option>';
  const chooseOption = '<option value="" disabled selected>Choose a client...</option>';

  const clientOptions = state.clients
    .map(c => `<option value="${c._id}">${c.name} ${c.company ? `(${c.company})` : ''}</option>`)
    .join('');

  DOM.docFilterClient.innerHTML = defaultOption + clientOptions;
  DOM.docClientSelect.innerHTML = chooseOption + clientOptions;
}

// 2. Render Dashboard Section
function renderDashboard() {
  // Stats counters
  DOM.statClients.textContent = state.clients.length;
  DOM.statDocs.textContent = state.documents.length;

  const contractsCount = state.documents.filter(d => d.category === 'contract').length;
  DOM.statContracts.textContent = contractsCount;

  const invoicesCount = state.documents.filter(d => d.category === 'invoice').length;
  DOM.statInvoices.textContent = invoicesCount;

  // Recent Clients Table (Top 5)
  if (state.clients.length === 0) {
    DOM.recentClientsTable.innerHTML = `<tr><td colspan="4" class="text-muted text-center">No clients added yet.</td></tr>`;
  } else {
    DOM.recentClientsTable.innerHTML = state.clients.slice(0, 5).map(c => `
      <tr>
        <td>
          <div class="font-semibold">${c.name}</div>
        </td>
        <td>${c.company || '<span class="text-muted">—</span>'}</td>
        <td>${c.email}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn" onclick="viewClientInDirectory('${c._id}')" title="View Client">
              <i data-lucide="external-link"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Recent Documents Table (Top 5)
  if (state.documents.length === 0) {
    DOM.recentDocsTable.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No files uploaded yet.</td></tr>`;
  } else {
    DOM.recentDocsTable.innerHTML = state.documents.slice(0, 5).map(d => `
      <tr>
        <td>
          <div class="flex items-center gap-2">
            <span class="font-semibold">${d.name}</span>
          </div>
        </td>
        <td>${d.client ? d.client.name : '<span class="text-muted">Unknown</span>'}</td>
        <td><span class="badge badge-${d.category || 'other'}">${d.category || 'other'}</span></td>
        <td>${formatBytes(d.fileSize)}</td>
        <td>${new Date(d.uploadedAt).toLocaleDateString()}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn" onclick="previewDocument('${d._id}')" title="Preview Document">
              <i data-lucide="eye"></i>
            </button>
            <button class="action-btn delete-action" onclick="deleteDocument('${d._id}')" title="Delete Document">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Document Categories List Breakdown
  const categories = ['invoice', 'contract', 'proposal', 'receipt', 'other'];
  const categoryCounts = {};
  categories.forEach(cat => categoryCounts[cat] = 0);
  
  state.documents.forEach(d => {
    const cat = d.category || 'other';
    if (categories.includes(cat)) {
      categoryCounts[cat]++;
    }
  });

  const totalDocs = state.documents.length || 1;
  DOM.categoryList.innerHTML = categories.map(cat => {
    const count = categoryCounts[cat];
    const percentage = Math.round((count / totalDocs) * 100);
    return `
      <div class="category-chart-item">
        <div class="category-info">
          <span class="category-name">${cat === 'other' ? 'Other Files' : cat + 's'}</span>
          <span class="category-count">${count} (${percentage}%)</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill progress-fill-${cat}" style="width: ${percentage}%; background-color: var(--${getColorVar(cat)}); shadow: 0 0 10px var(--${getColorVar(cat)}-glow)"></div>
        </div>
      </div>
    `;
  }).join('');
}

function getColorVar(category) {
  switch (category) {
    case 'invoice': return 'success';
    case 'contract': return 'primary';
    case 'proposal': return 'warning';
    case 'receipt': return 'secondary';
    default: return 'text-muted';
  }
}

// 3. Render Clients Tab (Directory & Search)
function renderClientsList() {
  const searchQuery = DOM.clientSearch.value.trim().toLowerCase();

  const filteredClients = state.clients.filter(c => {
    const nameMatch = c.name.toLowerCase().includes(searchQuery);
    const emailMatch = c.email.toLowerCase().includes(searchQuery);
    const companyMatch = (c.company || '').toLowerCase().includes(searchQuery);
    const tagMatch = (c.tags || []).some(t => t.toLowerCase().includes(searchQuery));
    return nameMatch || emailMatch || companyMatch || tagMatch;
  });

  if (filteredClients.length === 0) {
    DOM.clientsList.innerHTML = `<div class="text-muted text-center py-5">No matching clients found.</div>`;
    return;
  }

  DOM.clientsList.innerHTML = filteredClients.map(c => {
    const isSelected = state.selectedClientId === c._id;
    return `
      <div class="client-directory-item ${isSelected ? 'selected' : ''}" onclick="selectClient('${c._id}')">
        <div class="client-item-meta">
          <span class="client-item-name">${c.name}</span>
          <span class="client-item-company">${c.company || 'Individual Freelance'}</span>
          ${c.tags && c.tags.length > 0 ? `
            <div class="client-item-tags">
              ${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <i data-lucide="chevron-right" style="width: 16px; opacity: 0.6;"></i>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// Select client handler
window.selectClient = function (clientId) {
  state.selectedClientId = clientId;
  renderClientsList();
  renderClientDetails();
};

// Route user directly to client directory from recent table
window.viewClientInDirectory = function (clientId) {
  switchTab('clients');
  selectClient(clientId);
};

// Render Client details pane
function renderClientDetails() {
  if (!state.selectedClientId) {
    // Show empty state
    DOM.clientDetailPane.innerHTML = `
      <div class="detail-empty-state">
        <i data-lucide="user" class="empty-icon"></i>
        <h3>Select a Client</h3>
        <p class="text-muted">Choose a client from the left directory to view full profile details and documents.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const client = state.clients.find(c => c._id === state.selectedClientId);
  if (!client) {
    state.selectedClientId = null;
    renderClientDetails();
    return;
  }

  // Get documents related to this client
  const clientDocs = state.documents.filter(d => d.client && d.client._id === client._id);

  // Address assembly
  let addressString = 'No address stored';
  if (client.address && (client.address.street || client.address.city || client.address.country)) {
    const parts = [
      client.address.street,
      client.address.city,
      client.address.state,
      client.address.zipCode,
      client.address.country
    ].filter(Boolean);
    addressString = parts.join(', ');
  }

  DOM.clientDetailPane.innerHTML = `
    <div class="detail-content">
      <div class="detail-header">
        <div class="detail-title-block">
          <h2>${client.name}</h2>
          <p class="text-muted">
            <i data-lucide="briefcase" style="width: 16px;"></i>
            <span>${client.company || 'Freelancer Client'}</span>
          </p>
        </div>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm btn-icon-text" onclick="openEditClientModal('${client._id}')">
            <i data-lucide="edit"></i>
            <span>Edit</span>
          </button>
          <button class="btn btn-secondary btn-sm btn-icon-text text-danger delete-action" onclick="deleteClient('${client._id}')">
            <i data-lucide="trash-2"></i>
            <span>Delete</span>
          </button>
        </div>
      </div>

      <!-- Info Details Grid -->
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Email Address</span>
          <span class="detail-value"><a href="mailto:${client.email}">${client.email}</a></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Phone Number</span>
          <span class="detail-value">${client.phone || '<span class="text-muted">Not provided</span>'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Website</span>
          <span class="detail-value">${client.website ? `<a href="${client.website}" target="_blank">${client.website}</a>` : '<span class="text-muted">—</span>'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Location Address</span>
          <span class="detail-value">${addressString}</span>
        </div>
        <div class="detail-item col-span-full">
          <span class="detail-label">Tags</span>
          <div class="tag-list mt-1">
            ${client.tags && client.tags.length > 0 
              ? client.tags.map(t => `<span class="badge badge-other">${t}</span>`).join('') 
              : '<span class="text-muted">No tags added</span>'}
          </div>
        </div>
        ${client.notes ? `
          <div class="detail-item col-span-full">
            <span class="detail-label">Relationship Notes</span>
            <p class="meta-desc mt-1" style="background: rgba(255,255,255,0.01); padding: 0.75rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">${client.notes}</p>
          </div>
        ` : ''}
      </div>

      <!-- Documents Listing for client -->
      <div class="detail-section">
        <div class="detail-section-title">
          <span>Client Files (${clientDocs.length})</span>
          <button class="btn btn-secondary btn-sm btn-icon-text" onclick="openUploadForClient('${client._id}')">
            <i data-lucide="upload"></i>
            <span>Upload for Client</span>
          </button>
        </div>
        
        <div class="detail-documents-list">
          ${clientDocs.length === 0 ? `
            <div class="text-muted text-center py-4 border border-dashed rounded" style="border-color: var(--border-color)">
              No documents stored for this client directory.
            </div>
          ` : clientDocs.map(d => `
            <div class="client-doc-item">
              <div class="doc-info-block">
                <i data-lucide="${getDocIcon(d.fileType)}" class="doc-type-icon"></i>
                <div class="doc-text-meta">
                  <span class="doc-name-txt">${d.name}</span>
                  <span class="doc-sub-txt">${d.category.toUpperCase()} • ${formatBytes(d.fileSize)} • ${new Date(d.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div class="table-actions">
                <button class="action-btn" onclick="previewDocument('${d._id}')" title="Preview File">
                  <i data-lucide="eye"></i>
                </button>
                <button class="action-btn delete-action" onclick="deleteDocument('${d._id}')" title="Delete File">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

function getDocIcon(fileType) {
  if (!fileType) return 'file';
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return 'file-text';
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) return 'image';
  if (type.includes('word') || type.includes('docx') || type.includes('doc')) return 'file-digit';
  if (type.includes('sheet') || type.includes('csv') || type.includes('excel') || type.includes('xls')) return 'file-spreadsheet';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return 'archive';
  return 'file';
}

// 4. Render Documents Manager Tab
function renderDocumentsGrid() {
  const searchQuery = DOM.docSearch.value.trim().toLowerCase();
  const filterClient = DOM.docFilterClient.value;
  const filterCategory = DOM.docFilterCategory.value;

  const filteredDocs = state.documents.filter(d => {
    // Client Match
    const clientMatch = filterClient === 'all' || (d.client && d.client._id === filterClient);
    
    // Category Match
    const categoryMatch = filterCategory === 'all' || d.category === filterCategory;
    
    // Search Query Match
    const nameMatch = d.name.toLowerCase().includes(searchQuery);
    const descMatch = (d.description || '').toLowerCase().includes(searchQuery);
    const tagMatch = (d.tags || []).some(t => t.toLowerCase().includes(searchQuery));
    const clientNameMatch = d.client ? d.client.name.toLowerCase().includes(searchQuery) : false;

    return clientMatch && categoryMatch && (nameMatch || descMatch || tagMatch || clientNameMatch);
  });

  if (filteredDocs.length === 0) {
    DOM.documentsGrid.innerHTML = `
      <div class="text-center py-5 col-span-full">
        <i data-lucide="folder-open" class="empty-icon text-muted mb-2" style="width: 48px; height: 48px;"></i>
        <h3 class="text-muted">No files found matching the criteria.</h3>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  DOM.documentsGrid.innerHTML = filteredDocs.map(d => `
    <div class="document-card">
      <div class="card-top">
        <div class="card-icon color-${d.category || 'other'}">
          <i data-lucide="${getDocIcon(d.fileType)}"></i>
        </div>
        <div class="table-actions">
          <button class="action-btn" onclick="previewDocument('${d._id}')" title="Preview File">
            <i data-lucide="eye"></i>
          </button>
          <button class="action-btn delete-action" onclick="deleteDocument('${d._id}')" title="Delete File">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <div class="card-middle">
        <h3 class="card-title" title="${d.name}">${d.name}</h3>
        <p class="card-desc">${d.description || '<span class="text-muted">No description provided.</span>'}</p>
      </div>
      <div class="card-bottom">
        <a href="#" class="card-client-tag" onclick="viewClientInDirectory('${d.client ? d.client._id : ''}'); return false;">
          <i data-lucide="user" style="width: 12px; display: inline; vertical-align: middle; margin-right: 2px;"></i>
          <span>${d.client ? d.client.name : 'Unknown'}</span>
        </a>
        <span class="card-size">${formatBytes(d.fileSize)}</span>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

// --- Navigation Tab Manager ---
function setupEventListeners() {
  // Navigation tabs
  DOM.navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Dashboard "View All" redirection shortcuts
  DOM.viewAllButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target-tab');
      switchTab(target);
    });
  });

  // Realtime Searches
  DOM.globalSearch.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    // Proxy search query to tab active searches
    if (state.activeTab === 'clients') {
      DOM.clientSearch.value = val;
      renderClientsList();
    } else if (state.activeTab === 'documents') {
      DOM.docSearch.value = val;
      renderDocumentsGrid();
    } else {
      // If on Dashboard, redirect user based on search content or search both
      DOM.clientSearch.value = val;
      DOM.docSearch.value = val;
      // Navigate to whichever they prefer, let's say documents if they press enter,
      // or search both under the hood
    }
  });

  DOM.clientSearch.addEventListener('input', renderClientsList);
  
  DOM.docSearch.addEventListener('input', renderDocumentsGrid);
  DOM.docFilterClient.addEventListener('change', renderDocumentsGrid);
  DOM.docFilterCategory.addEventListener('change', renderDocumentsGrid);

  // Client Modal controls
  DOM.quickAddClientBtn.addEventListener('click', () => openClientModal());
  DOM.addClientTabBtn.addEventListener('click', () => openClientModal());
  DOM.clientCancel.addEventListener('click', closeClientModal);
  DOM.clientClose.addEventListener('click', closeClientModal);

  DOM.clientForm.addEventListener('submit', handleClientSubmit);

  // Document Upload Modal controls
  DOM.quickUploadDocBtn.addEventListener('click', () => openDocumentModal());
  DOM.uploadDocTabBtn.addEventListener('click', () => openDocumentModal());
  DOM.docCancel.addEventListener('click', closeDocumentModal);
  DOM.docClose.addEventListener('click', closeDocumentModal);

  DOM.documentForm.addEventListener('submit', handleDocumentSubmit);

  // File drag & drop actions
  setupDragAndDrop();

  // Document Preview Modal close
  DOM.previewClose.addEventListener('click', () => {
    DOM.previewModal.classList.remove('active');
    DOM.previewViewer.innerHTML = ''; // Clean up viewer memory
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Set tab active headers
  DOM.navLinks.forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Switch display blocks
  DOM.tabPanes.forEach(pane => {
    if (pane.id === `${tabId}-tab`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  // Clear global header searches
  DOM.globalSearch.value = '';

  // Trigger content refreshes
  renderAll();
}

// --- Client CRUD Operations ---
function openClientModal(clientToEdit = null) {
  DOM.clientForm.reset();
  if (clientToEdit) {
    DOM.clientModalTitle.textContent = 'Edit Client Directory';
    DOM.clientModalSubmit.textContent = 'Save Changes';
    document.getElementById('client-form-id').value = clientToEdit._id;
    document.getElementById('client-name').value = clientToEdit.name;
    document.getElementById('client-company').value = clientToEdit.company || '';
    document.getElementById('client-email').value = clientToEdit.email;
    document.getElementById('client-phone').value = clientToEdit.phone || '';
    document.getElementById('client-website').value = clientToEdit.website || '';
    document.getElementById('client-notes').value = clientToEdit.notes || '';
    
    if (clientToEdit.tags) {
      document.getElementById('client-tags').value = clientToEdit.tags.join(', ');
    }

    if (clientToEdit.address) {
      document.getElementById('client-street').value = clientToEdit.address.street || '';
      document.getElementById('client-city').value = clientToEdit.address.city || '';
      document.getElementById('client-state').value = clientToEdit.address.state || '';
      document.getElementById('client-zip').value = clientToEdit.address.zipCode || '';
      document.getElementById('client-country').value = clientToEdit.address.country || '';
    }
  } else {
    DOM.clientModalTitle.textContent = 'Create Client Directory';
    DOM.clientModalSubmit.textContent = 'Save Client';
    document.getElementById('client-form-id').value = '';
  }

  DOM.clientModal.classList.add('active');
}

window.openEditClientModal = function(clientId) {
  const client = state.clients.find(c => c._id === clientId);
  if (client) {
    openClientModal(client);
  }
};

function closeClientModal() {
  DOM.clientModal.classList.remove('active');
}

async function handleClientSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('client-form-id').value;
  const tagsStr = document.getElementById('client-tags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  const clientData = {
    name: document.getElementById('client-name').value.trim(),
    company: document.getElementById('client-company').value.trim(),
    email: document.getElementById('client-email').value.trim(),
    phone: document.getElementById('client-phone').value.trim(),
    website: document.getElementById('client-website').value.trim(),
    notes: document.getElementById('client-notes').value.trim(),
    tags,
    address: {
      street: document.getElementById('client-street').value.trim(),
      city: document.getElementById('client-city').value.trim(),
      state: document.getElementById('client-state').value.trim(),
      zipCode: document.getElementById('client-zip').value.trim(),
      country: document.getElementById('client-country').value.trim()
    }
  };

  try {
    if (id) {
      // Edit mode
      await window.clientAPI.update(id, clientData);
      showToast('Client updated successfully!', 'success');
    } else {
      // Create mode
      const result = await window.clientAPI.create(clientData);
      showToast('Client folder created successfully!', 'success');
      state.selectedClientId = result.data._id; // Autoselect new client
    }
    
    closeClientModal();
    await loadData();
    renderAll();
  } catch (err) {
    showToast(err.message || 'Error processing client form.', 'error');
  }
}

window.deleteClient = async function(clientId) {
  const client = state.clients.find(c => c._id === clientId);
  if (!client) return;

  const confirmed = confirm(`Are you sure you want to delete ${client.name}? This will also permanently delete all associated documents cascadingly!`);
  if (!confirmed) return;

  try {
    await window.clientAPI.delete(clientId);
    showToast('Client directory and files deleted.', 'success');
    if (state.selectedClientId === clientId) {
      state.selectedClientId = null;
    }
    await loadData();
    renderAll();
  } catch (err) {
    showToast(err.message || 'Error deleting client.', 'error');
  }
};

// --- Document CRUD Operations ---
function openDocumentModal(preselectedClientId = null) {
  DOM.documentForm.reset();
  resetUploadedFile();
  
  if (preselectedClientId) {
    DOM.docClientSelect.value = preselectedClientId;
  }

  DOM.documentModal.classList.add('active');
}

window.openUploadForClient = function (clientId) {
  openDocumentModal(clientId);
};

function closeDocumentModal() {
  DOM.documentModal.classList.remove('active');
  resetUploadedFile();
}

// File Drag & Drop implementation
function setupDragAndDrop() {
  const zone = DOM.fileDropZone;
  const input = DOM.fileInput;

  zone.addEventListener('click', () => input.click());

  input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  DOM.btnRemoveSelectedFile.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUploadedFile();
  });
}

function handleSelectedFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size exceeds the 10MB limit.', 'warning');
    return;
  }

  // Visual Update
  DOM.fileDropZone.style.display = 'none';
  DOM.selectedFileDetails.style.display = 'flex';
  DOM.selectedFileName.textContent = file.name;
  DOM.selectedFileSize.textContent = formatBytes(file.size);

  // Auto-fill document title input if empty
  const docNameInput = document.getElementById('doc-name');
  if (!docNameInput.value) {
    // Strip extension
    const extIndex = file.name.lastIndexOf('.');
    docNameInput.value = extIndex > 0 ? file.name.substring(0, extIndex) : file.name;
  }

  // Load File as Base64 Data URL
  const reader = new FileReader();
  reader.onload = function(e) {
    state.uploadedFileBase64 = e.target.result;
    state.uploadedFileType = file.type || 'application/octet-stream';
    state.uploadedFileSize = file.size;
  };
  reader.onerror = function() {
    showToast('Failed to read file.', 'error');
    resetUploadedFile();
  };
  reader.readAsDataURL(file);
}

function resetUploadedFile() {
  DOM.fileInput.value = '';
  state.uploadedFileBase64 = null;
  state.uploadedFileType = null;
  state.uploadedFileSize = 0;
  
  DOM.fileDropZone.style.display = 'flex';
  DOM.selectedFileDetails.style.display = 'none';
  DOM.selectedFileName.textContent = '-';
  DOM.selectedFileSize.textContent = '-';
}

async function handleDocumentSubmit(e) {
  e.preventDefault();

  if (!state.uploadedFileBase64) {
    showToast('Please select or drag a file to upload.', 'warning');
    return;
  }

  const tagsStr = document.getElementById('doc-tags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  const documentData = {
    client: DOM.docClientSelect.value,
    name: document.getElementById('doc-name').value.trim(),
    category: document.getElementById('doc-category').value,
    description: document.getElementById('doc-description').value.trim(),
    fileUrl: state.uploadedFileBase64, // Raw base64 data url stored in DB
    fileType: state.uploadedFileType,
    fileSize: state.uploadedFileSize,
    isPublic: document.getElementById('doc-is-public').checked,
    tags
  };

  try {
    await window.documentAPI.create(documentData);
    showToast('Document uploaded successfully!', 'success');
    closeDocumentModal();
    await loadData();
    renderAll();
  } catch (err) {
    showToast(err.message || 'Error uploading document.', 'error');
  }
}

window.deleteDocument = async function(docId) {
  const doc = state.documents.find(d => d._id === docId);
  if (!doc) return;

  const confirmed = confirm(`Are you sure you want to permanently delete "${doc.name}"?`);
  if (!confirmed) return;

  try {
    await window.documentAPI.delete(docId);
    showToast('Document deleted.', 'success');
    await loadData();
    renderAll();
  } catch (err) {
    showToast(err.message || 'Error deleting document.', 'error');
  }
};

// --- Preview Document Manager ---
window.previewDocument = function (docId) {
  const doc = state.documents.find(d => d._id === docId);
  if (!doc) return;

  DOM.previewTitle.textContent = doc.name;
  DOM.previewClient.textContent = doc.client ? doc.client.name : 'Unknown';
  DOM.previewCategory.textContent = doc.category;
  DOM.previewCategory.className = `meta-value badge badge-${doc.category}`;
  DOM.previewDetails.textContent = `${doc.fileType} • ${formatBytes(doc.fileSize)}`;
  DOM.previewDate.textContent = new Date(doc.uploadedAt).toLocaleString();
  DOM.previewVisibility.textContent = doc.isPublic ? 'Public Shareable Link Enabled' : 'Private Folder';
  DOM.previewDesc.textContent = doc.description || 'No description provided for this document.';
  
  DOM.previewTags.innerHTML = doc.tags && doc.tags.length > 0 
    ? doc.tags.map(t => `<span class="tag">${t}</span>`).join('')
    : '<span class="text-muted">No tags</span>';

  // Set download button href & filename
  DOM.previewDownloadBtn.href = doc.fileUrl;
  DOM.previewDownloadBtn.setAttribute('download', doc.name);

  // Render Viewer based on type
  DOM.previewViewer.innerHTML = '';
  const type = doc.fileType.toLowerCase();
  
  if (type.includes('image')) {
    const img = document.createElement('img');
    img.src = doc.fileUrl;
    img.alt = doc.name;
    DOM.previewViewer.appendChild(img);
  } else if (type.includes('pdf')) {
    // Use standard embed or iframe for base64 PDF
    const embed = document.createElement('iframe');
    embed.src = doc.fileUrl;
    DOM.previewViewer.appendChild(embed);
  } else if (type.includes('text') || type.includes('json') || type.includes('javascript') || type.includes('html')) {
    // Render text contents (by decoding base64 if it's dataurl)
    try {
      const base64Data = doc.fileUrl.split(',')[1];
      const decodedText = atob(base64Data);
      
      const pre = document.createElement('pre');
      pre.className = 'preview-text-box';
      pre.textContent = decodedText;
      DOM.previewViewer.appendChild(pre);
    } catch (e) {
      renderPreviewFallback(doc);
    }
  } else {
    // Non-previewable formats fallback
    renderPreviewFallback(doc);
  }

  DOM.previewModal.classList.add('active');
  lucide.createIcons();
};

function renderPreviewFallback(doc) {
  DOM.previewViewer.innerHTML = `
    <div class="preview-fallback">
      <i data-lucide="${getDocIcon(doc.fileType)}"></i>
      <div>
        <h3>No Preview Available</h3>
        <p class="text-muted mt-1">This format (${doc.fileType}) cannot be rendered directly in the browser.</p>
        <p class="text-muted">Use the download link to view it locally.</p>
      </div>
      <a href="${doc.fileUrl}" download="${doc.name}" class="btn btn-primary btn-icon-text">
        <i data-lucide="download"></i>
        <span>Download to View</span>
      </a>
    </div>
  `;
}

// --- Utilities ---
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Toast Notifications System
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-circle';
  if (type === 'warning') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span class="toast-message">${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);
  lucide.createIcons();

  // Remove toast after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 3500);
}
