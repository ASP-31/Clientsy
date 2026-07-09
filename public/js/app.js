// --- App State Store ---
const state = {
  user: null,
  clients: [],
  documents: [],
  selectedClientId: null,
  uploadedFileBase64: null,
  uploadedFileType: null,
  uploadedFileSize: 0
};

// --- DOM References ---
const DOM = {
  // Global & Layout
  globalSearch: document.getElementById('global-search'),
  headerAvatar: document.getElementById('header-avatar'),
  headerName: document.getElementById('header-name'),
  btnLogout: document.getElementById('btn-logout'),

  // Cabinet Workspace
  cabinetStatsText: document.getElementById('cabinet-stats-text'),
  btnNewFolder: document.getElementById('btn-new-folder'),
  foldersGrid: document.getElementById('folders-grid-container'),

  // Slide-out Folder Drawer
  drawerOverlay: document.getElementById('folder-drawer-overlay'),
  folderDrawer: document.getElementById('folder-drawer'),
  drawerClose: document.getElementById('drawer-close'),
  drawerClientName: document.getElementById('drawer-client-name'),
  drawerClientCompany: document.getElementById('drawer-client-company'),
  drawerEmail: document.getElementById('drawer-email'),
  drawerPhone: document.getElementById('drawer-phone'),
  drawerWebsite: document.getElementById('drawer-website'),
  drawerAddress: document.getElementById('drawer-address'),
  drawerTags: document.getElementById('drawer-tags'),
  drawerNotes: document.getElementById('drawer-notes'),
  drawerNotesWrapper: document.getElementById('drawer-notes-wrapper'),
  btnEditClient: document.getElementById('btn-edit-client'),
  btnDeleteClient: document.getElementById('btn-delete-client'),
  btnUploadFile: document.getElementById('btn-upload-file'),
  drawerFilesCount: document.getElementById('drawer-files-count'),
  drawerFilesList: document.getElementById('drawer-files-list-container'),

  // Modals
  clientModal: document.getElementById('client-modal'),
  clientForm: document.getElementById('client-form'),
  clientModalTitle: document.getElementById('client-modal-title'),
  clientModalSubmit: document.getElementById('client-modal-submit'),
  clientCancel: document.getElementById('client-modal-cancel'),
  clientClose: document.getElementById('client-modal-close'),

  documentModal: document.getElementById('document-modal'),
  documentForm: document.getElementById('document-form'),
  docClientHidden: document.getElementById('doc-client'),
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
  previewDesc: document.getElementById('preview-desc'),
  previewTags: document.getElementById('preview-tags'),
  previewViewer: document.getElementById('preview-viewer-container'),
  previewDownloadBtn: document.getElementById('preview-download-btn'),
  previewClose: document.getElementById('preview-modal-close'),

  // Auth Card
  authScreen: document.getElementById('auth-screen'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  tabLoginBtn: document.getElementById('tab-login-btn'),
  tabRegisterBtn: document.getElementById('tab-register-btn'),
  
  toastContainer: document.getElementById('toast-container')
};

// --- Initializer ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupAuthListeners();
  checkSession();
});

// --- Session Verification & Data Loader ---
async function checkSession() {
  const token = localStorage.getItem('token');
  if (!token) {
    showAuthScreen();
    return;
  }

  try {
    const res = await window.authAPI.getMe();
    state.user = res.data;
    
    // Update headers and avatars
    if (DOM.headerName) DOM.headerName.textContent = state.user.name;
    if (DOM.headerAvatar) {
      const initials = state.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      DOM.headerAvatar.textContent = initials || 'DV';
    }

    hideAuthScreen();
    await loadData();
    renderAll();
  } catch (err) {
    localStorage.removeItem('token');
    showAuthScreen();
  }
}

function showAuthScreen() {
  if (DOM.authScreen) DOM.authScreen.classList.add('active');
}

function hideAuthScreen() {
  if (DOM.authScreen) DOM.authScreen.classList.remove('active');
}

async function loadData() {
  try {
    const clientsRes = await window.clientAPI.getAll();
    state.clients = clientsRes.data || [];
  } catch (err) {
    showToast('Failed to load cabinet folders.', 'error');
  }

  try {
    const docsRes = await window.documentAPI.getAll();
    state.documents = docsRes.data || [];
  } catch (err) {
    showToast('Failed to load file records.', 'error');
  }
}

// --- Render Operations ---
function renderAll() {
  // 1. Stats Counter Text
  if (DOM.cabinetStatsText) {
    const count = state.clients.length;
    DOM.cabinetStatsText.textContent = `${count} ${count === 1 ? 'folder directory' : 'folder directories'} stored in vault`;
  }

  // 2. Render Folders
  renderFoldersGrid();

  // 3. Render Drawer if open
  if (state.selectedClientId) {
    renderFolderDrawerContent();
  }

  lucide.createIcons();
}

// Render Folder grid (Cabinet view)
function renderFoldersGrid() {
  const searchQuery = DOM.globalSearch.value.trim().toLowerCase();

  const filteredClients = state.clients.filter(c => {
    const nameMatch = c.name.toLowerCase().includes(searchQuery);
    const companyMatch = (c.company || '').toLowerCase().includes(searchQuery);
    const emailMatch = c.email.toLowerCase().includes(searchQuery);
    const tagMatch = (c.tags || []).some(t => t.toLowerCase().includes(searchQuery));
    return nameMatch || companyMatch || emailMatch || tagMatch;
  });

  if (filteredClients.length === 0) {
    DOM.foldersGrid.innerHTML = `
      <div class="text-center py-5 col-span-full">
        <i data-lucide="folder-open" class="empty-icon text-muted" style="width: 40px; height: 40px; opacity: 0.3; margin-bottom: 0.5rem; display: inline-block;"></i>
        <h3 class="text-muted">No folders found in cabinet.</h3>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  DOM.foldersGrid.innerHTML = filteredClients.map(c => {
    const files = state.documents.filter(d => d.client && d.client._id === c._id);
    return `
      <div class="folder-card" onclick="openFolderDrawer('${c._id}')">
        <i data-lucide="folder" class="folder-icon-glow"></i>
        <div class="folder-meta">
          <h3 class="folder-name">${c.name}</h3>
          <span class="folder-company">${c.company || 'Private Client'}</span>
        </div>
        <div class="folder-bottom">
          <span class="folder-files-count">
            <i data-lucide="file"></i>
            <span>${files.length} ${files.length === 1 ? 'file' : 'files'}</span>
          </span>
          ${c.tags && c.tags.length > 0 ? `
            <div class="folder-tags">
              ${c.tags.slice(0, 2).map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// --- Sliding Drawer Operations ---
window.openFolderDrawer = function (clientId) {
  state.selectedClientId = clientId;
  renderFolderDrawerContent();
  
  if (DOM.folderDrawer) DOM.folderDrawer.classList.add('open');
  if (DOM.drawerOverlay) DOM.drawerOverlay.classList.add('active');
};

function closeFolderDrawer() {
  state.selectedClientId = null;
  if (DOM.folderDrawer) DOM.folderDrawer.classList.remove('open');
  if (DOM.drawerOverlay) DOM.drawerOverlay.classList.remove('active');
}

function renderFolderDrawerContent() {
  const client = state.clients.find(c => c._id === state.selectedClientId);
  if (!client) {
    closeFolderDrawer();
    return;
  }

  DOM.drawerClientName.textContent = client.name;
  DOM.drawerClientCompany.textContent = client.company || 'Private Client';
  DOM.drawerEmail.textContent = client.email;
  DOM.drawerPhone.textContent = client.phone || 'Not provided';
  DOM.drawerWebsite.innerHTML = client.website 
    ? `<a href="${client.website}" target="_blank" style="color: var(--primary); text-decoration: none;">${client.website}</a>` 
    : '—';

  // Address
  let address = '—';
  if (client.address && (client.address.street || client.address.city || client.address.country)) {
    address = [
      client.address.street,
      client.address.city,
      client.address.state,
      client.address.country
    ].filter(Boolean).join(', ');
  }
  DOM.drawerAddress.textContent = address;

  // Tags
  DOM.drawerTags.innerHTML = client.tags && client.tags.length > 0
    ? client.tags.map(t => `<span class="tag">${t}</span>`).join('')
    : '<span class="text-muted" style="font-size: 0.8rem;">No tags</span>';

  // Notes
  if (client.notes) {
    DOM.drawerNotesWrapper.style.display = 'block';
    DOM.drawerNotes.textContent = client.notes;
  } else {
    DOM.drawerNotesWrapper.style.display = 'none';
  }

  // Render Drawer Files
  const files = state.documents.filter(d => d.client && d.client._id === client._id);
  DOM.drawerFilesCount.textContent = files.length;

  if (files.length === 0) {
    DOM.drawerFilesList.innerHTML = `<div class="text-center py-4 text-muted" style="font-size: 0.85rem;">No files uploaded in this folder directory.</div>`;
  } else {
    DOM.drawerFilesList.innerHTML = files.map(f => `
      <div class="drawer-file-item">
        <div class="file-info-block">
          <i data-lucide="${getDocIcon(f.fileType)}" class="file-icon"></i>
          <div class="file-text-meta">
            <span class="file-name-span" title="${f.name}">${f.name}</span>
            <span class="file-sub-span">${f.category.toUpperCase()} • ${formatBytes(f.fileSize)}</span>
          </div>
        </div>
        <div class="table-actions">
          <button class="action-btn" onclick="previewDocument('${f._id}')" title="Preview File">
            <i data-lucide="eye"></i>
          </button>
          <button class="action-btn delete-action" onclick="deleteDocument('${f._id}')" title="Delete File">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  lucide.createIcons();
}

function getDocIcon(fileType) {
  if (!fileType) return 'file';
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return 'file-text';
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) return 'image';
  if (type.includes('word') || type.includes('docx') || type.includes('doc')) return 'file-digit';
  if (type.includes('sheet') || type.includes('csv') || type.includes('excel') || type.includes('xls')) return 'file-spreadsheet';
  return 'file';
}

// --- Event Listeners Mapping ---
function setupEventListeners() {
  // Global search input
  DOM.globalSearch.addEventListener('input', renderFoldersGrid);

  // New folder triggers
  DOM.btnNewFolder.addEventListener('click', () => openClientModal());
  DOM.clientCancel.addEventListener('click', closeClientModal);
  DOM.clientClose.addEventListener('click', closeClientModal);
  DOM.clientForm.addEventListener('submit', handleClientSubmit);

  // Drawer buttons
  DOM.drawerClose.addEventListener('click', closeFolderDrawer);
  DOM.drawerOverlay.addEventListener('click', closeFolderDrawer);
  
  DOM.btnEditClient.addEventListener('click', () => {
    const client = state.clients.find(c => c._id === state.selectedClientId);
    if (client) openClientModal(client);
  });

  DOM.btnDeleteClient.addEventListener('click', () => {
    if (state.selectedClientId) deleteClient(state.selectedClientId);
  });

  DOM.btnUploadFile.addEventListener('click', () => {
    if (state.selectedClientId) openDocumentModal(state.selectedClientId);
  });

  // Document modal triggers
  DOM.docCancel.addEventListener('click', closeDocumentModal);
  DOM.docClose.addEventListener('click', closeDocumentModal);
  DOM.documentForm.addEventListener('submit', handleDocumentSubmit);
  
  setupDragAndDrop();

  // Document preview modal close
  DOM.previewClose.addEventListener('click', () => {
    DOM.previewModal.classList.remove('active');
    DOM.previewViewer.innerHTML = '';
  });

  // Logout trigger
  if (DOM.btnLogout) {
    DOM.btnLogout.addEventListener('click', logout);
  }
}

// --- Client Folder CRUD ---
function openClientModal(clientToEdit = null) {
  DOM.clientForm.reset();
  
  if (clientToEdit) {
    DOM.clientModalTitle.textContent = 'Edit Folder Details';
    DOM.clientModalSubmit.textContent = 'Save Folder';
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
    DOM.clientModalTitle.textContent = 'Create Folder';
    DOM.clientModalSubmit.textContent = 'Create Folder';
    document.getElementById('client-form-id').value = '';
  }

  DOM.clientModal.classList.add('active');
}

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
      await window.clientAPI.update(id, clientData);
      showToast('Folder details updated.', 'success');
    } else {
      const res = await window.clientAPI.create(clientData);
      showToast('Client folder created.', 'success');
      state.selectedClientId = res.data._id; // Focus on the new folder
    }
    
    closeClientModal();
    await loadData();
    renderAll();
  } catch (err) {
    showToast(err.message || 'Error processing folder form.', 'error');
  }
}

async function deleteClient(clientId) {
  const client = state.clients.find(c => c._id === clientId);
  if (!client) return;

  const confirmed = confirm(`Are you sure you want to permanently delete the folder "${client.name}"? This action will delete all contained files!`);
  if (!confirmed) return;

  try {
    await window.clientAPI.delete(clientId);
    showToast('Folder and contained files deleted.', 'success');
    closeFolderDrawer();
    await loadData();
    renderAll();
  } catch (err) {
    showToast(err.message || 'Error deleting folder.', 'error');
  }
}

// --- Document/File Operations ---
function openDocumentModal(clientId) {
  DOM.documentForm.reset();
  resetUploadedFile();
  DOM.docClientHidden.value = clientId;
  DOM.documentModal.classList.add('active');
}

function closeDocumentModal() {
  DOM.documentModal.classList.remove('active');
  resetUploadedFile();
}

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
    showToast('Files must be under 10MB.', 'warning');
    return;
  }

  DOM.fileDropZone.style.display = 'none';
  DOM.selectedFileDetails.style.display = 'flex';
  DOM.selectedFileName.textContent = file.name;
  DOM.selectedFileSize.textContent = formatBytes(file.size);

  const docNameInput = document.getElementById('doc-name');
  if (!docNameInput.value) {
    const extIndex = file.name.lastIndexOf('.');
    docNameInput.value = extIndex > 0 ? file.name.substring(0, extIndex) : file.name;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    state.uploadedFileBase64 = e.target.result;
    state.uploadedFileType = file.type || 'application/octet-stream';
    state.uploadedFileSize = file.size;
  };
  reader.onerror = function() {
    showToast('Failed to parse file.', 'error');
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
}

async function handleDocumentSubmit(e) {
  e.preventDefault();

  if (!state.uploadedFileBase64) {
    showToast('Please select a file to file.', 'warning');
    return;
  }

  const tagsStr = document.getElementById('doc-tags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  const documentData = {
    client: DOM.docClientHidden.value,
    name: document.getElementById('doc-name').value.trim(),
    category: document.getElementById('doc-category').value,
    description: document.getElementById('doc-description').value.trim(),
    fileUrl: state.uploadedFileBase64,
    fileType: state.uploadedFileType,
    fileSize: state.uploadedFileSize,
    isPublic: document.getElementById('doc-is-public').checked,
    tags
  };

  try {
    await window.documentAPI.create(documentData);
    showToast('File uploaded successfully!', 'success');
    closeDocumentModal();
    await loadData();
    renderAll();
  } catch (err) {
    showToast(err.message || 'Error saving file record.', 'error');
  }
}

window.deleteDocument = async function(docId) {
  const doc = state.documents.find(d => d._id === docId);
  if (!doc) return;

  const confirmed = confirm(`Are you sure you want to permanently delete "${doc.name}"?`);
  if (!confirmed) return;

  try {
    await window.documentAPI.delete(docId);
    showToast('File deleted.', 'success');
    await loadData();
    renderAll();
  } catch (err) {
    showToast(err.message || 'Error deleting file.', 'error');
  }
};

// --- Preview Control ---
window.previewDocument = function(docId) {
  const doc = state.documents.find(d => d._id === docId);
  if (!doc) return;

  DOM.previewTitle.textContent = doc.name;
  DOM.previewClient.textContent = doc.client ? doc.client.name : 'Unknown';
  DOM.previewCategory.textContent = doc.category;
  DOM.previewCategory.className = `meta-value badge badge-${doc.category}`;
  DOM.previewDetails.textContent = `${doc.fileType} • ${formatBytes(doc.fileSize)}`;
  DOM.previewDate.textContent = new Date(doc.uploadedAt).toLocaleString();
  DOM.previewDesc.textContent = doc.description || 'No description provided.';
  
  DOM.previewTags.innerHTML = doc.tags && doc.tags.length > 0 
    ? doc.tags.map(t => `<span class="tag">${t}</span>`).join('')
    : '<span class="text-muted">No tags</span>';

  DOM.previewDownloadBtn.href = doc.fileUrl;
  DOM.previewDownloadBtn.setAttribute('download', doc.name);

  // Render
  DOM.previewViewer.innerHTML = '';
  const type = doc.fileType.toLowerCase();
  
  if (type.includes('image')) {
    const img = document.createElement('img');
    img.src = doc.fileUrl;
    img.alt = doc.name;
    DOM.previewViewer.appendChild(img);
  } else if (type.includes('pdf')) {
    const embed = document.createElement('iframe');
    embed.src = doc.fileUrl;
    DOM.previewViewer.appendChild(embed);
  } else if (type.includes('text') || type.includes('json') || type.includes('javascript') || type.includes('html')) {
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
      </div>
      <a href="${doc.fileUrl}" download="${doc.name}" class="btn btn-primary btn-sm">
        <i data-lucide="download"></i>
        <span>Download to View</span>
      </a>
    </div>
  `;
}

// --- Auth Section ---
function setupAuthListeners() {
  if (DOM.tabLoginBtn && DOM.tabRegisterBtn) {
    DOM.tabLoginBtn.addEventListener('click', () => {
      DOM.tabLoginBtn.classList.add('active');
      DOM.tabRegisterBtn.classList.remove('active');
      DOM.loginForm.classList.add('active');
      DOM.registerForm.classList.remove('active');
    });

    DOM.tabRegisterBtn.addEventListener('click', () => {
      DOM.tabRegisterBtn.classList.add('active');
      DOM.tabLoginBtn.classList.remove('active');
      DOM.registerForm.classList.add('active');
      DOM.loginForm.classList.remove('active');
    });
  }

  if (DOM.loginForm) {
    DOM.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const res = await window.authAPI.login(email, password);
        localStorage.setItem('token', res.data.token);
        showToast('Successfully logged in!', 'success');
        await checkSession();
      } catch (err) {
        showToast(err.message || 'Login failed. Invalid credentials.', 'error');
      }
    });
  }

  if (DOM.registerForm) {
    DOM.registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;

      try {
        const res = await window.authAPI.register(name, email, password);
        localStorage.setItem('token', res.data.token);
        showToast('Registration successful!', 'success');
        await checkSession();
      } catch (err) {
        showToast(err.message || 'Registration failed.', 'error');
      }
    });
  }
}

window.handleTokenExpired = function() {
  logout();
  showToast('Your session has expired. Please log in again.', 'warning');
};

function logout() {
  localStorage.removeItem('token');
  state.user = null;
  state.clients = [];
  state.documents = [];
  state.selectedClientId = null;

  if (DOM.headerName) DOM.headerName.textContent = 'Developer';
  if (DOM.headerAvatar) DOM.headerAvatar.textContent = 'DV';

  closeFolderDrawer();
  showAuthScreen();

  if (DOM.loginForm) DOM.loginForm.reset();
  if (DOM.registerForm) DOM.registerForm.reset();
  if (DOM.tabLoginBtn) DOM.tabLoginBtn.click();
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

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 3500);
}
