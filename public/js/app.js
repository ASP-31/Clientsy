// --- Global Form Submit capturing wrapper (disables button + loading status + inline error highlights) ---
(function() {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'submit' && this.tagName === 'FORM') {
      const form = this;
      const wrappedListener = async function(e) {
        const submitBtn = form.querySelector('[type="submit"]') || form.querySelector('button:not([type="button"])');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset.origText = submitBtn.innerHTML;
          submitBtn.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:1.5px;vertical-align:middle;margin-right:4px;"></span> Saving...';
        }
        
        // Clear all inline errors in this form
        form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        form.querySelectorAll('input, select, textarea').forEach(el => el.style.borderColor = '');
        
        try {
          // Call original handler
          await listener.call(this, e);
        } catch (err) {
          console.error('Captured form error:', err);
          if (err && err.errors) {
            Object.keys(err.errors).forEach(field => {
              const input = form.querySelector(`#${field}`) || form.querySelector(`[name="${field}"]`) || form.querySelector(`[id$="${field}"]`);
              if (input) {
                input.style.borderColor = 'var(--danger)';
                const errDiv = document.createElement('div');
                errDiv.className = 'invalid-feedback';
                errDiv.style.color = 'var(--danger)';
                errDiv.style.fontSize = '0.75rem';
                errDiv.style.marginTop = '0.25rem';
                errDiv.textContent = err.errors[field].message || err.errors[field];
                input.parentNode.appendChild(errDiv);
              }
            });
          } else {
            showToast(err.message || 'Action failed', 'error');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.origText;
          }
        }
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
})();

// --- App State Store ---
const state = {
  user: null,
  activeView: 'dashboard',
  clients: [],
  documents: [],
  projects: [],
  invoices: [],
  proposals: [],
  intakes: [],
  meetings: [],
  reviews: [],
  teamMembers: [],
  selectedClientId: null,
  activeProjectId: null,
  clientsFilterTab: 'active',
  projectsFilterTab: 'active',
  
  // File upload state
  selectedFile: null,
  
  // Signature Canvas state
  isDrawing: false,
  sigCanvas: null,
  sigCtx: null,
  
  // Client Portal state
  portalData: null
};

// --- DOM References ---
const DOM = {
  sidebar: document.getElementById('app-sidebar'),
  menuItems: document.querySelectorAll('.menu-item'),
  headerViewTitle: document.getElementById('header-view-title'),
  globalSearch: document.getElementById('global-search'),
  
  // Auth Screen
  authScreen: document.getElementById('auth-screen'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  tabLoginBtn: document.getElementById('tab-login-btn'),
  tabRegisterBtn: document.getElementById('tab-register-btn'),
  logoutBtn: document.getElementById('btn-logout'),
  
  // Avatar & Profile
  footerAvatar: document.getElementById('footer-avatar'),
  footerName: document.getElementById('footer-name'),
  footerRole: document.getElementById('footer-role'),
  
  // Screens
  screens: {
    dashboard: document.getElementById('view-dashboard'),
    leads: document.getElementById('view-leads'),
    clients: document.getElementById('view-clients'),
    projects: document.getElementById('view-projects'),
    invoices: document.getElementById('view-invoices'),
    proposals: document.getElementById('view-proposals'),
    intakes: document.getElementById('view-intakes'),
    meetings: document.getElementById('view-meetings'),
    reviews: document.getElementById('view-reviews'),
    team: document.getElementById('view-team'),
    portal: document.getElementById('view-client-portal'),
    publicIntake: document.getElementById('view-public-intake'),
    publicReviews: document.getElementById('view-public-reviews')
  },
  
  // Sliding Drawer
  drawer: document.getElementById('folder-drawer'),
  drawerOverlay: document.getElementById('folder-drawer-overlay'),
  drawerTabs: document.querySelectorAll('.drawer-tab'),
  drawerTabContents: document.querySelectorAll('.drawer-tab-content'),
  drawerClientName: document.getElementById('drawer-client-name'),
  drawerClientCompany: document.getElementById('drawer-client-company'),
  
  // Toast
  toastContainer: document.getElementById('toast-container')
};

// --- Initializer ---
document.addEventListener('DOMContentLoaded', () => {
  setupThemeAndResponsive();
  setupNavigation();
  setupAuthListeners();
  setupClientModalListeners();
  setupDocumentModalListeners();
  setupProjectModalListeners();
  setupInvoiceModalListeners();
  setupProposalModalListeners();
  setupIntakeModalListeners();
  setupMeetingModalListeners();
  setupTeamModalListeners();
  setupDragAndDrop();
  setupSignatureCanvas();
  
  // Initial check
  checkSessionAndRoute();
});

// --- Session & Route Router ---
async function checkSessionAndRoute() {
  const urlParams = new URLSearchParams(window.location.search);
  const intakeToken = urlParams.get('intake');
  const reviewsUser = urlParams.get('reviews');
  const tokenParam = urlParams.get('token');
  const errorParam = urlParams.get('error');

  if (tokenParam) {
    localStorage.setItem('token', tokenParam);
    // Remove query parameters cleanly
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (errorParam) {
    // Show error toast dynamically after layout initialization
    setTimeout(() => {
      showToast('Authentication failed. Please try again.', 'error');
    }, 500);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (intakeToken) {
    // Show public intake form screen directly
    hideLayouts();
    DOM.screens.publicIntake.classList.add('active');
    await loadPublicIntakeForm(intakeToken);
    return;
  }

  if (reviewsUser) {
    // Show public reviews portfolio directly
    hideLayouts();
    DOM.screens.publicReviews.classList.add('active');
    await loadPublicReviewsPortfolio(reviewsUser);
    return;
  }

  const token = localStorage.getItem('token') || tokenParam;
  if (!token) {
    showLandingPage();
    return;
  }

  try {
    const res = await window.authAPI.getMe();
    state.user = res.data;
    
    // Set Profile details
    if (DOM.footerName) DOM.footerName.textContent = state.user.name;
    if (DOM.footerRole) DOM.footerRole.textContent = state.user.role;
    if (DOM.footerAvatar) {
      DOM.footerAvatar.textContent = state.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    
    hideLandingPage();
    hideAuthScreen();
    
    if (state.user.role === 'client') {
      // Set to Client Portal mode
      setupClientPortalUI();
      await loadPortalData();
    } else {
      // Set to Developer Mode
      setupDeveloperUI();
      await loadAllData();
      switchView('dashboard');
    }
  } catch (err) {
    console.error('Session failed:', err);
    logout();
  }
}

function hideLayouts() {
  if (DOM.sidebar) DOM.sidebar.style.display = 'none';
  const mainHeader = document.querySelector('.main-header');
  if (mainHeader) mainHeader.style.display = 'none';
  document.querySelectorAll('.screen-panel').forEach(p => p.classList.remove('active'));
}

window.showLandingPage = function() {
  hideLayouts();
  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.style.display = 'none';
  
  const landingPage = document.getElementById('landing-page');
  if (landingPage) {
    landingPage.style.display = 'block';
    lucide.createIcons();
  }
};

window.hideLandingPage = function() {
  const landingPage = document.getElementById('landing-page');
  if (landingPage) landingPage.style.display = 'none';
  
  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.style.display = 'flex';

  // Restore sidebar and main header display styles (fixing missing layout elements after login)
  if (DOM.sidebar) DOM.sidebar.style.display = '';
  const mainHeader = document.querySelector('.main-header');
  if (mainHeader) mainHeader.style.display = '';
};

window.showAuthScreen = function(mode) {
  // Ensure landing page is visible since auth forms are embedded on it
  const landingPage = document.getElementById('landing-page');
  if (landingPage) landingPage.style.display = 'block';
  
  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.style.display = 'none';
  
  if (mode === 'register') {
    if (DOM.tabRegisterBtn) DOM.tabRegisterBtn.click();
  } else {
    if (DOM.tabLoginBtn) DOM.tabLoginBtn.click();
  }
  
  // Smooth scroll to the auth section in main flow
  const authSection = document.getElementById('auth-section');
  if (authSection) {
    authSection.scrollIntoView({ behavior: 'smooth' });
  }
  lucide.createIcons();
};

window.hideAuthScreen = function() {
  // Embedded in page flow, active status handled natively
};

function setupClientPortalUI() {
  if (DOM.sidebar) {
    // Modify sidebar menu for client view
    const menu = DOM.sidebar.querySelector('.sidebar-menu');
    menu.innerHTML = `
      <div class="menu-item active" data-view="portal">
        <i data-lucide="layout-dashboard"></i>
        <span>My Workspace</span>
      </div>
    `;
    lucide.createIcons();
    // Add click listener
    menu.querySelector('.menu-item').addEventListener('click', () => switchView('portal'));
  }
  switchView('portal');
}

function setupDeveloperUI() {
  // Navigation sidebar item clicks
  DOM.menuItems.forEach(item => {
    item.addEventListener('click', () => {
      DOM.menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      switchView(item.getAttribute('data-view'));
    });
  });
}

// --- Data Fetch Loaders ---
async function loadAllData() {
  try {
    const clientsRes = await window.clientAPI.getAll();
    state.clients = clientsRes.data || [];
  } catch (err) {}

  try {
    const docsRes = await window.documentAPI.getAll();
    state.documents = docsRes.data || [];
  } catch (err) {}

  try {
    const projectsRes = await window.projectAPI.getAll();
    state.projects = projectsRes.data || [];
  } catch (err) {}

  try {
    const invoicesRes = await window.invoiceAPI.getAll();
    state.invoices = invoicesRes.data || [];
  } catch (err) {}

  try {
    const proposalsRes = await window.proposalAPI.getAll();
    state.proposals = proposalsRes.data || [];
  } catch (err) {}

  try {
    const intakesRes = await window.intakeAPI.getAll();
    state.intakes = intakesRes.data || [];
  } catch (err) {}

  try {
    const meetingsRes = await window.meetingAPI.getAll();
    state.meetings = meetingsRes.data || [];
    // Setup reminders
    setupMeetingReminders(state.meetings);
  } catch (err) {}

  try {
    const reviewsRes = await window.reviewAPI.getAll();
    state.reviews = reviewsRes.data || [];
  } catch (err) {}

  try {
    const teamRes = await window.teamAPI.getAll();
    state.teamMembers = teamRes.data || [];
  } catch (err) {}
}

async function loadPortalData() {
  try {
    const res = await window.portalAPI.getDashboard();
    state.portalData = res.data;
    renderClientPortal(res.data);
  } catch (err) {
    showToast('Failed to load client workspace data', 'error');
  }
}

// --- Dynamic View Switcher ---
function switchView(viewName) {
  state.activeView = viewName;
  
  // Hide all screens
  Object.values(DOM.screens).forEach(screen => {
    if (screen) screen.classList.remove('active');
  });

  // Show active screen
  const targetScreen = DOM.screens[viewName];
  if (targetScreen) targetScreen.classList.add('active');

  // Set titles
  if (DOM.headerViewTitle) {
    DOM.headerViewTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
  }

  // Trigger render logic
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'leads') renderLeadsPipeline();
  if (viewName === 'clients') renderClientsVault();
  if (viewName === 'projects') renderProjectsModule();
  if (viewName === 'invoices') renderInvoicesModule();
  if (viewName === 'proposals') renderProposalsModule();
  if (viewName === 'intakes') renderIntakesModule();
  if (viewName === 'meetings') renderMeetingsModule();
  if (viewName === 'reviews') renderReviewsModule();
  if (viewName === 'team') renderTeamModule();
  
  lucide.createIcons();
}

function setupNavigation() {
  if (DOM.logoutBtn) {
    DOM.logoutBtn.addEventListener('click', logout);
  }
  
  // Setup search filter
  if (DOM.globalSearch) {
    DOM.globalSearch.addEventListener('input', () => {
      if (state.activeView === 'clients') renderClientsVault();
      if (state.activeView === 'invoices') renderInvoicesModule();
      if (state.activeView === 'projects') renderProjectsModule();
      if (state.activeView === 'leads') renderLeadsPipeline();
    });
  }

  // Drawer Tabs switching
  DOM.drawerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      DOM.drawerTabs.forEach(t => t.classList.remove('active'));
      DOM.drawerTabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const tabId = `tab-${tab.getAttribute('data-tab')}`;
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// --- View 1: Dashboard Analytics ---
function renderDashboard() {
  // Stats math
  const paidInvoices = state.invoices.filter(i => i.type === 'invoice' && i.status === 'paid');
  const revenueTotal = paidInvoices.reduce((sum, item) => sum + item.totalAmount, 0);
  
  const activeClients = state.clients.filter(c => c.status === 'active');
  const openProjects = state.projects.filter(p => p.status !== 'done');
  
  const sentInvoices = state.invoices.filter(i => i.type === 'invoice' && i.status === 'sent');
  const outstandingSum = sentInvoices.reduce((sum, item) => sum + item.totalAmount, 0);

  document.getElementById('dash-stat-revenue').textContent = `₹${formatNumberIndian(revenueTotal)}`;
  document.getElementById('dash-stat-clients').textContent = activeClients.length;
  document.getElementById('dash-stat-projects').textContent = openProjects.length;
  document.getElementById('dash-stat-invoices').textContent = `₹${formatNumberIndian(outstandingSum)}`;

  // SVG Chart rendering
  renderRevenueSVGChart(paidInvoices);

  // Recent list
  const recentContainer = document.getElementById('dashboard-recent-list');
  recentContainer.innerHTML = '';
  
  const items = [];
  // Add invoices
  state.invoices.slice(0, 3).forEach(i => {
    items.push({
      date: new Date(i.issueDate),
      html: `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          <div>
            <div style="font-size:0.85rem; font-weight:600;">${escapeHTML(i.type.toUpperCase())} ${escapeHTML(i.invoiceNumber)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(i.client ? i.client.name : 'Unknown')}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size:0.85rem; font-weight:800;">₹${formatNumberIndian(i.totalAmount)}</div>
            <span class="badge badge-${escapeHTML(i.status)}">${escapeHTML(i.status)}</span>
          </div>
        </div>
      `
    });
  });

  // Add meetings
  state.meetings.slice(0, 3).forEach(m => {
    items.push({
      date: new Date(m.startAt),
      html: `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          <div>
            <div style="font-size:0.85rem; font-weight:600;"><i data-lucide="video" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> ${escapeHTML(m.title)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${new Date(m.startAt).toLocaleString()}</div>
          </div>
          <a href="${safeExternalUrl(m.meetLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="border-radius:6px; padding:0.25rem 0.5rem; font-size:0.7rem;">Join Call</a>
        </div>
      `
    });
  });

  items.sort((a,b) => b.date - a.date);
  
  if (items.length === 0) {
    recentContainer.innerHTML = `<div class="text-center py-4 text-muted">No updates logged. Create folder vaults or invoices to start.</div>`;
  } else {
    recentContainer.innerHTML = items.slice(0, 5).map(item => item.html).join('');
  }
}

function renderRevenueSVGChart(paidInvoices) {
  const container = document.getElementById('revenue-chart-container');
  container.innerHTML = '';
  
  // Calculate month values
  const monthlySums = Array(12).fill(0);
  paidInvoices.forEach(i => {
    const month = new Date(i.issueDate).getMonth();
    monthlySums[month] += i.totalAmount;
  });

  const maxVal = Math.max(...monthlySums, 50000);
  
  monthlySums.forEach((sum, idx) => {
    const heightPercent = (sum / maxVal) * 80 + 5; // offset for minimum visible bar
    const bar = document.createElement('div');
    bar.style.flex = '1';
    bar.style.margin = '0 6px';
    bar.style.display = 'flex';
    bar.style.flexDirection = 'column';
    bar.style.alignItems = 'center';
    bar.style.height = '100%';
    bar.style.justifyContent = 'flex-end';
    bar.innerHTML = `
      <span style="font-size: 0.7rem; font-weight: 700; margin-bottom: 0.25rem; visibility: ${sum > 0 ? 'visible' : 'hidden'};">₹${Math.round(sum/1000)}k</span>
      <div style="width: 100%; height: ${heightPercent}%; background: linear-gradient(to top, var(--primary-alpha), var(--primary)); border-radius: 4px 4px 0 0; transition: height 0.5s ease;" title="₹${sum}"></div>
    `;
    container.appendChild(bar);
  });
}

// --- View 2: CRM Lead Pipeline ---
function renderLeadsPipeline() {
  const query = DOM.globalSearch.value.toLowerCase();
  const leads = state.clients.filter(c => c.status === 'lead');
  
  const stages = ['new', 'in-talks', 'proposal-sent', 'won', 'lost'];
  stages.forEach(stage => {
    const stageContainer = document.getElementById(`cards-lead-${stage === 'in-talks' ? 'talks' : stage === 'proposal-sent' ? 'sent' : stage}`);
    stageContainer.innerHTML = '';
    
    const filteredLeads = leads.filter(l => l.leadStage === stage && (l.name.toLowerCase().includes(query) || (l.company || '').toLowerCase().includes(query)));
    
    // Count label
    document.getElementById(`count-lead-${stage === 'in-talks' ? 'talks' : stage === 'proposal-sent' ? 'sent' : stage}`).textContent = filteredLeads.length;

    if (filteredLeads.length === 0) {
      stageContainer.innerHTML = `<div class="text-center py-4 text-muted" style="font-size: 0.75rem;">No leads.</div>`;
    } else {
      filteredLeads.forEach(l => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', l._id);
        card.innerHTML = `
          <div class="card-title">${escapeHTML(l.name)}</div>
          <div class="card-company">${escapeHTML(l.company || 'Private Lead')}</div>
          <div class="card-value">₹${formatNumberIndian(l.leadValue || 0)}</div>
          <div class="card-footer">
            <button class="action-btn" onclick="openFolderDrawer('${l._id}')"><i data-lucide="eye" style="width:14px;height:14px;"></i></button>
            ${stage !== 'won' ? `<button class="btn btn-secondary btn-sm" style="border-radius:4px; padding:0.2rem 0.4rem; font-size:0.65rem;" onclick="convertLeadToClient('${l._id}')">Convert</button>` : ''}
          </div>
        `;
        
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', l._id);
          card.style.opacity = '0.5';
        });
        
        card.addEventListener('dragend', () => {
          card.style.opacity = '1';
        });

        stageContainer.appendChild(card);
      });
    }
  });
}

window.convertLeadToClient = async function(leadId) {
  try {
    await window.clientAPI.update(leadId, {
      status: 'active',
      leadStage: 'won'
    });
    showToast('Lead converted to Active Client!', 'success');
    await loadAllData();
    renderLeadsPipeline();
  } catch (err) {
    showToast('Failed to convert lead', 'error');
  }
};

function setupDragAndDrop() {
  const columns = document.querySelectorAll('.kanban-column');
  
  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      const cardsContainer = col.querySelector('.column-cards');
      cardsContainer.classList.add('drag-over');
    });

    col.addEventListener('dragleave', () => {
      const cardsContainer = col.querySelector('.column-cards');
      cardsContainer.classList.remove('drag-over');
    });

    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      const cardsContainer = col.querySelector('.column-cards');
      cardsContainer.classList.remove('drag-over');
      
      const clientId = e.dataTransfer.getData('text/plain');
      const newStage = col.getAttribute('data-stage');
      
      if (!clientId || !newStage) return;

      try {
        const payload = { leadStage: newStage };
        if (newStage === 'won') {
          payload.status = 'active';
        }
        await window.clientAPI.update(clientId, payload);
        showToast(`Lead moved to ${newStage.toUpperCase()}`, 'success');
        await loadAllData();
        renderLeadsPipeline();
      } catch (err) {
        showToast('Failed to update stage', 'error');
      }
    });
  });
}

// --- View 3: Clients Vault ---
function renderClientsVault() {
  const container = document.getElementById('folders-grid-container');
  container.innerHTML = '';
  
  const query = DOM.globalSearch.value.toLowerCase();
  const filter = state.clientsFilterTab || 'active';
  
  const filteredClients = state.clients.filter(c => {
    if (c.status === 'lead') return false;
    if (filter === 'active') {
      if (c.status !== 'active' && c.status !== 'on-hold') return false;
    } else if (filter === 'completed') {
      if (c.status !== 'completed') return false;
    }
    return c.name.toLowerCase().includes(query) || (c.company || '').toLowerCase().includes(query);
  });
  
  if (filteredClients.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 col-span-full">
        <i data-lucide="folder-open" class="empty-icon text-muted" style="width: 40px; height: 40px; opacity: 0.3; margin-bottom: 0.5rem; display: inline-block;"></i>
        <h3 class="text-muted">No folders found in cabinet.</h3>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  filteredClients.forEach(c => {
    const files = state.documents.filter(d => d.client && d.client._id === c._id);
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.setAttribute('onclick', `openFolderDrawer('${c._id}')`);
    card.innerHTML = `
      <i data-lucide="folder" class="folder-icon-glow"></i>
      <div class="folder-meta">
        <h3 class="folder-name">${escapeHTML(c.name)}</h3>
        <span class="folder-company">${escapeHTML(c.company || 'Private Client')}</span>
      </div>
      <div class="folder-bottom">
        <span>
          <i data-lucide="file" style="display:inline; width:12px; height:12px; vertical-align:middle; margin-right:2px;"></i>
          <span>${files.length} files</span>
        </span>
        <span class="badge badge-${escapeHTML(c.status)}">${escapeHTML(c.status)}</span>
      </div>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

window.filterClientsVault = function(tab) {
  state.clientsFilterTab = tab;
  document.getElementById('tab-clients-active').classList.toggle('active', tab === 'active');
  document.getElementById('tab-clients-completed').classList.toggle('active', tab === 'completed');
  renderClientsVault();
};

// --- Sliding Drawer Operations ---
window.openFolderDrawer = function(clientId) {
  state.selectedClientId = clientId;
  renderFolderDrawer();
  DOM.drawer.classList.add('open');
  DOM.drawerOverlay.classList.add('active');
};

function closeFolderDrawer() {
  state.selectedClientId = null;
  DOM.drawer.classList.remove('open');
  DOM.drawerOverlay.classList.remove('active');
}

DOM.drawerOverlay.addEventListener('click', closeFolderDrawer);
document.getElementById('drawer-close').addEventListener('click', closeFolderDrawer);

function renderFolderDrawer() {
  const client = state.clients.find(c => c._id === state.selectedClientId);
  if (!client) return;

  DOM.drawerClientName.textContent = client.name;
  DOM.drawerClientCompany.textContent = client.company || 'Private Client';
  document.getElementById('drawer-email').textContent = client.email;
  document.getElementById('drawer-phone').textContent = client.phone || 'Not provided';
  document.getElementById('drawer-website').innerHTML = client.website 
    ? `<a href="${safeExternalUrl(client.website)}" target="_blank" rel="noopener noreferrer">${escapeHTML(client.website)}</a>` 
    : '—';
  
  let address = '—';
  if (client.address && (client.address.street || client.address.city || client.address.country)) {
    address = [client.address.street, client.address.city, client.address.state, client.address.country].filter(Boolean).join(', ');
  }
  document.getElementById('drawer-address').textContent = address;
  
  document.getElementById('drawer-tags').innerHTML = client.tags && client.tags.length > 0
    ? client.tags.map(t => `<span class="badge" style="background-color:var(--primary-alpha); color:var(--primary); text-transform:none;">${escapeHTML(t)}</span>`).join('')
    : '<span class="text-muted">No tags</span>';
  
  if (client.notes) {
    document.getElementById('drawer-notes-wrapper').style.display = 'block';
    document.getElementById('drawer-notes').textContent = client.notes;
  } else {
    document.getElementById('drawer-notes-wrapper').style.display = 'none';
  }

  // Files Tab
  const files = state.documents.filter(d => d.client && d.client._id === client._id);
  document.getElementById('drawer-files-count').textContent = files.length;
  const filesList = document.getElementById('drawer-files-list-container');
  if (files.length === 0) {
    filesList.innerHTML = `<div class="text-center py-4 text-muted">No files stored.</div>`;
  } else {
    filesList.innerHTML = files.map(f => `
      <div class="drawer-file-item" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
        <div>
          <span style="font-size:0.85rem; font-weight:600;">${escapeHTML(f.name)}</span>
          <div style="font-size:0.7rem; color:var(--text-muted);">${f.category.toUpperCase()} • ${formatBytes(f.fileSize)}</div>
        </div>
        <div style="display:flex; gap:0.25rem;">
          <button class="action-btn" onclick="previewDocument('${f._id}')"><i data-lucide="eye" style="width:14px;height:14px;"></i></button>
          <button class="action-btn delete-action" onclick="deleteDocument('${f._id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
        </div>
      </div>
    `).join('');
  }

  // Projects Tab
  const projList = document.getElementById('drawer-projects-list');
  const clientProjs = state.projects.filter(p => p.client && p.client._id === client._id);
  if (clientProjs.length === 0) {
    projList.innerHTML = `<div class="text-center py-4 text-muted">No active projects.</div>`;
  } else {
    projList.innerHTML = clientProjs.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
        <div>
          <span style="font-size:0.85rem; font-weight:600;">${escapeHTML(p.name)}</span>
          <div style="font-size:0.7rem; color:var(--text-muted);">Budget: ₹${formatNumberIndian(p.budget)}</div>
        </div>
        <span class="badge badge-${escapeHTML(p.status)}">${escapeHTML(p.status)}</span>
      </div>
    `).join('');
  }

  // Billing Tab
  const billingList = document.getElementById('drawer-invoices-list');
  const clientInvs = state.invoices.filter(i => i.client && i.client._id === client._id);
  if (clientInvs.length === 0) {
    billingList.innerHTML = `<div class="text-center py-4 text-muted">No invoices raised.</div>`;
  } else {
    billingList.innerHTML = clientInvs.map(i => `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
        <div>
          <span style="font-size:0.85rem; font-weight:600;">${escapeHTML(i.invoiceNumber)} (${escapeHTML(i.type.toUpperCase())})</span>
          <div style="font-size:0.7rem; color:var(--text-muted);">₹${formatNumberIndian(i.totalAmount)}</div>
        </div>
        <span class="badge badge-${escapeHTML(i.status)}">${escapeHTML(i.status)}</span>
      </div>
    `).join('');
  }

  lucide.createIcons();
}

// --- View 4: Projects & Kanban ---
function renderProjectsModule() {
  const selector = document.getElementById('projects-selector-row');
  selector.innerHTML = '';

  const projFilter = state.projectsFilterTab || 'active';
  const filteredProjects = state.projects.filter(p => {
    if (projFilter === 'active') {
      return p.status !== 'done';
    } else {
      return p.status === 'done';
    }
  });

  if (filteredProjects.length === 0) {
    document.getElementById('no-projects-view').style.display = 'block';
    document.getElementById('project-board-card').style.display = 'none';
    return;
  }

  filteredProjects.forEach(p => {
    const btn = document.createElement('button');
    btn.className = `btn ${state.activeProjectId === p._id ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    btn.textContent = p.name;
    btn.addEventListener('click', () => {
      state.activeProjectId = p._id;
      renderProjectsModule();
    });
    selector.appendChild(btn);
  });

  const activeProjExists = filteredProjects.some(p => p._id === state.activeProjectId);
  if (!activeProjExists && filteredProjects.length > 0) {
    state.activeProjectId = filteredProjects[0]._id;
  }

  const activeProj = filteredProjects.find(p => p._id === state.activeProjectId);
  if (activeProj) {
    document.getElementById('no-projects-view').style.display = 'none';
    document.getElementById('project-board-card').style.display = 'block';
    
    document.getElementById('proj-board-name').textContent = activeProj.name;
    document.getElementById('proj-board-meta').textContent = `${activeProj.client ? activeProj.client.name : 'Private'} • Budget: ₹${formatNumberIndian(activeProj.budget)} • Deadline: ${activeProj.deadline ? new Date(activeProj.deadline).toLocaleDateString() : 'None'}`;
    
    // Update Complete/Reopen button status
    const completeBtn = document.getElementById('btn-complete-project');
    if (completeBtn) {
      if (activeProj.status === 'done') {
        completeBtn.innerHTML = `<i data-lucide="refresh-cw"></i><span id="btn-complete-project-text">Reopen Project</span>`;
      } else {
        completeBtn.innerHTML = `<i data-lucide="check-circle"></i><span id="btn-complete-project-text">Complete Project</span>`;
      }
    }

    // Render Kanban Tasks
    const columns = ['to-do', 'doing', 'done'];
    columns.forEach(col => {
      const container = document.getElementById(`cards-task-${col === 'to-do' ? 'todo' : col === 'doing' ? 'doing' : 'done'}`);
      container.innerHTML = '';
      
      const colTasks = (activeProj.tasks || []).filter(t => t.status === col);
      document.getElementById(`count-task-${col === 'to-do' ? 'todo' : col === 'doing' ? 'doing' : 'done'}`).textContent = colTasks.length;

      if (colTasks.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted" style="font-size:0.75rem;">No tasks.</div>`;
      } else {
        colTasks.forEach((t, index) => {
          const card = document.createElement('div');
          card.className = 'kanban-card';
          card.style.padding = '0.75rem';
          card.innerHTML = `
            <div style="font-size:0.8rem; font-weight:600;">${escapeHTML(t.name)}</div>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">Assignee: ${t.assignedTo || 'Unassigned'}</div>
            <div style="display:flex; justify-content:flex-end; gap:0.25rem; margin-top:0.5rem;">
              <button class="action-btn" onclick="moveTask('${activeProj._id}', ${activeProj.tasks.indexOf(t)}, 'prev')"><i data-lucide="arrow-left" style="width:12px;height:12px;"></i></button>
              <button class="action-btn" onclick="moveTask('${activeProj._id}', ${activeProj.tasks.indexOf(t)}, 'next')"><i data-lucide="arrow-right" style="width:12px;height:12px;"></i></button>
              <button class="action-btn delete-action" onclick="deleteTask('${activeProj._id}', ${activeProj.tasks.indexOf(t)})"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
            </div>
          `;
          container.appendChild(card);
        });
      }
    });
  }
  lucide.createIcons();
}

window.filterProjectsView = function(tab) {
  state.projectsFilterTab = tab;
  document.getElementById('tab-projects-active').classList.toggle('active', tab === 'active');
  document.getElementById('tab-projects-completed').classList.toggle('active', tab === 'completed');
  renderProjectsModule();
};

window.moveTask = async function(projId, taskIdx, dir) {
  const proj = state.projects.find(p => p._id === projId);
  if (!proj) return;
  
  const stages = ['to-do', 'doing', 'done'];
  const curStage = proj.tasks[taskIdx].status;
  let nextStageIdx = stages.indexOf(curStage) + (dir === 'next' ? 1 : -1);
  if (nextStageIdx < 0 || nextStageIdx > 2) return;
  
  proj.tasks[taskIdx].status = stages[nextStageIdx];
  try {
    await window.projectAPI.update(projId, { tasks: proj.tasks });
    await loadAllData();
    renderProjectsModule();
  } catch (err) {
    showToast('Failed to move task', 'error');
  }
};

window.deleteTask = async function(projId, taskIdx) {
  const proj = state.projects.find(p => p._id === projId);
  if (!proj) return;

  proj.tasks.splice(taskIdx, 1);
  try {
    await window.projectAPI.update(projId, { tasks: proj.tasks });
    await loadAllData();
    renderProjectsModule();
  } catch (err) {
    showToast('Failed to delete task', 'error');
  }
};

// --- View 5: Invoices & Quotes ---
function renderInvoicesModule() {
  const tbody = document.getElementById('invoices-table-body');
  tbody.innerHTML = '';
  
  const query = DOM.globalSearch.value.toLowerCase();
  const filtered = state.invoices.filter(i => (i.client && i.client.name.toLowerCase().includes(query)) || i.invoiceNumber.toLowerCase().includes(query));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No records found.</td></tr>`;
    return;
  }

  filtered.forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(i.invoiceNumber)}</strong></td>
      <td>${escapeHTML(i.client ? i.client.name : 'Unknown')}</td>
      <td style="text-transform: capitalize;">${escapeHTML(i.type)}</td>
      <td><strong>₹${formatNumberIndian(i.totalAmount)}</strong></td>
      <td>${new Date(i.issueDate).toLocaleDateString()}</td>
      <td><span class="badge badge-${escapeHTML(i.status)}">${escapeHTML(i.status)}</span></td>
      <td>
        <button class="action-btn" onclick="printInvoiceDocument('${i._id}')" title="Print/PDF"><i data-lucide="printer" style="width:14px;height:14px;"></i></button>
        ${i.type === 'quotation' && i.status === 'approved' ? `<button class="action-btn" onclick="convertQuoteToInvoice('${i._id}')" title="Convert to Invoice" style="color:var(--success);"><i data-lucide="refresh-cw" style="width:14px;height:14px;"></i></button>` : ''}
        <button class="action-btn" onclick="openInvoiceEdit('${i._id}')" title="Edit"><i data-lucide="edit" style="width:14px;height:14px;"></i></button>
        <button class="action-btn delete-action" onclick="deleteInvoiceRecord('${i._id}')" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

window.convertQuoteToInvoice = async function(quoteId) {
  try {
    const quote = state.invoices.find(i => i._id === quoteId);
    if (!quote) return;
    
    await window.invoiceAPI.create({
      client: quote.client._id,
      invoiceNumber: 'INV-' + quote.invoiceNumber.substring(4),
      type: 'invoice',
      status: 'sent',
      items: quote.items,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      totalAmount: quote.totalAmount,
      notes: quote.notes,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });
    
    showToast('Quotation converted to Invoice successfully!', 'success');
    await loadAllData();
    renderInvoicesModule();
  } catch (err) {
    showToast('Failed to convert quotation', 'error');
  }
};

window.deleteInvoiceRecord = async function(id) {
  if (!confirm('Are you sure you want to delete this invoice/quotation?')) return;
  try {
    await window.invoiceAPI.delete(id);
    showToast('Invoice deleted', 'success');
    await loadAllData();
    renderInvoicesModule();
  } catch (err) {
    showToast('Failed to delete invoice', 'error');
  }
};

// --- View 6: Proposals ---
function renderProposalsModule() {
  const tbody = document.getElementById('proposals-table-body');
  tbody.innerHTML = '';
  
  if (state.proposals.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No proposals found.</td></tr>`;
    return;
  }

  state.proposals.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(p.title)}</strong></td>
      <td>${escapeHTML(p.client ? p.client.name : 'Unknown')}</td>
      <td><span class="badge badge-${escapeHTML(p.status)}">${escapeHTML(p.status)}</span></td>
      <td>${escapeHTML(p.signature ? p.signature.signedBy || '—' : '—')}</td>
      <td>${p.signature ? new Date(p.signature.signedAt).toLocaleDateString() : '—'}</td>
      <td>
        <button class="action-btn" onclick="openProposalEdit('${p._id}')"><i data-lucide="edit" style="width:14px;height:14px;"></i></button>
        <button class="action-btn delete-action" onclick="deleteProposalRecord('${p._id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

window.deleteProposalRecord = async function(id) {
  if (!confirm('Are you sure you want to delete this proposal?')) return;
  try {
    await window.proposalAPI.delete(id);
    showToast('Proposal deleted', 'success');
    await loadAllData();
    renderProposalsModule();
  } catch (err) {
    showToast('Failed to delete proposal', 'error');
  }
};

// --- View 7: Intake Forms ---
function renderIntakesModule() {
  const tbody = document.getElementById('intakes-table-body');
  tbody.innerHTML = '';
  
  if (state.intakes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No onboarding templates.</td></tr>`;
    return;
  }

  state.intakes.forEach(f => {
    const publicUrl = `${window.location.origin}/?intake=${f.token}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(f.title)}</strong></td>
      <td>${escapeHTML(f.client ? f.client.name : 'Unassigned')}</td>
      <td>
        <span style="font-size:0.75rem; color:var(--primary); font-family:monospace; word-break:break-all;">${publicUrl}</span>
        <button class="action-btn" onclick="copyTextToClipboard('${publicUrl}')" title="Copy Link"><i data-lucide="copy" style="width:12px;height:12px;"></i></button>
      </td>
      <td><strong>${f.submissions ? f.submissions.length : 0}</strong> responses</td>
      <td>
        <button class="action-btn" onclick="viewIntakeSubmissions('${f._id}')" title="View Responses"><i data-lucide="eye" style="width:14px;height:14px;"></i></button>
        <button class="action-btn delete-action" onclick="deleteIntakeFormRecord('${f._id}')" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

window.deleteIntakeFormRecord = async function(id) {
  if (!confirm('Are you sure you want to delete this form?')) return;
  try {
    await window.intakeAPI.delete(id);
    showToast('Form template deleted', 'success');
    await loadAllData();
    renderIntakesModule();
  } catch (err) {
    showToast('Failed to delete form', 'error');
  }
};

window.viewIntakeSubmissions = function(formId) {
  const form = state.intakes.find(i => i._id === formId);
  if (!form) return;
  
  const content = document.createElement('div');
  content.innerHTML = `
    <h3 style="margin-bottom:1rem; font-family:var(--font-display);">${escapeHTML(form.title)} Answers</h3>
    ${form.submissions.length === 0 ? '<p class="text-muted">No client responses logged yet.</p>' : form.submissions.map(sub => `
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem; margin-bottom:1rem; background-color:white;">
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">Submitted: ${new Date(sub.submittedAt).toLocaleString()}</div>
        ${sub.answers.map(ans => `
          <div style="margin-bottom: 0.5rem;">
            <strong>${escapeHTML(ans.label)}:</strong>
            <p style="font-size:0.85rem; margin-top:0.15rem; color:#444;">${escapeHTML(ans.value || '—')}</p>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
  
  const viewer = document.getElementById('preview-viewer-container');
  viewer.innerHTML = '';
  viewer.appendChild(content);
  
  // Configure preview modal headers
  document.getElementById('preview-title').textContent = 'Submissions';
  document.getElementById('preview-category').textContent = 'Onboarding';
  document.getElementById('preview-details').textContent = `${form.submissions.length} submissions`;
  document.getElementById('preview-date').textContent = new Date().toLocaleDateString();
  document.getElementById('preview-desc').textContent = form.description || '';
  
  document.getElementById('preview-modal').classList.add('active');
  lucide.createIcons();
};

// --- View 8: Meetings ---
function renderMeetingsModule() {
  const tbody = document.getElementById('meetings-table-body');
  tbody.innerHTML = '';

  if (state.meetings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No scheduled meetings.</td></tr>`;
    return;
  }

  state.meetings.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(m.title)}</strong></td>
      <td>${escapeHTML(m.client ? m.client.name : 'Unknown')}</td>
      <td>${new Date(m.startAt).toLocaleString()}</td>
      <td>
        <a href="${safeExternalUrl(m.meetLink)}" target="_blank" rel="noopener noreferrer" style="color:var(--primary); font-weight:600;">Join Meeting</a>
      </td>
      <td>
        <button class="action-btn delete-action" onclick="deleteMeetingRecord('${m._id}')"><i data-lucide="calendar-x" style="width:14px;height:14px;"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

window.deleteMeetingRecord = async function(id) {
  if (!confirm('Are you sure you want to cancel this meeting?')) return;
  try {
    await window.meetingAPI.delete(id);
    showToast('Meeting cancelled successfully.', 'success');
    await loadAllData();
    renderMeetingsModule();
  } catch (err) {
    showToast('Failed to cancel meeting', 'error');
  }
};

// --- View 9: Reviews ---
function renderReviewsModule() {
  // Populate portfolio details
  if (state.user) {
    const portfolioUrl = `${window.location.origin}/?reviews=${state.user._id}`;
    document.getElementById('reviews-portfolio-url').textContent = portfolioUrl;
    document.getElementById('btn-view-public-portfolio').href = portfolioUrl;
    
    document.getElementById('badge-snippet-code').textContent = 
`<div style="border:1px solid #4f46e5; border-radius:12px; padding:10px; width:180px; text-align:center; font-family:sans-serif; background-color:#fff;">
  <a href="${portfolioUrl}" target="_blank" style="text-decoration:none; color:#0f172a;">
    <div style="font-size:12px; font-weight:bold; color:#64748b;">Verified Reviews</div>
    <div style="font-size:18px; color:#f59e0b; margin:4px 0;">★★★★★</div>
    <div style="font-size:11px; color:#4f46e5; font-weight:bold;">Clientsy Portfolio</div>
  </a>
</div>`;
  }

  const feed = document.getElementById('reviews-feed-container');
  feed.innerHTML = '';
  
  if (state.reviews.length === 0) {
    feed.innerHTML = `<div class="text-center py-4 text-muted">No client reviews logged yet.</div>`;
    return;
  }

  state.reviews.forEach(r => {
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '1rem';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:center;">
        <div>
          <strong>${escapeHTML(r.client ? r.client.name : 'Anonymous Client')}</strong>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.5rem;">${escapeHTML(r.client && r.client.company ? r.client.company : '')}</span>
        </div>
        <div style="color:var(--warning); font-size:1.1rem;">${stars}</div>
      </div>
      <p style="font-size:0.85rem; line-height:1.5;">"${escapeHTML(r.feedback)}"</p>
      <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.75rem;">Project: ${escapeHTML(r.project ? r.project.name : 'Unknown')} • ${r.isVerified ? 'Verified Review' : 'Unverified Review'}</div>
    `;
    feed.appendChild(card);
  });
}

// --- View 10: Team Management ---
function renderTeamModule() {
  const tbody = document.getElementById('team-table-body');
  tbody.innerHTML = '';
  
  if (state.teamMembers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No team members added.</td></tr>`;
    return;
  }

  state.teamMembers.forEach(m => {
    const paidSum = m.payments ? m.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(m.name)}</strong></td>
      <td>${escapeHTML(m.email)}</td>
      <td>
        <span style="font-weight:600; font-size:0.85rem;">${escapeHTML(m.role)}</span>
        <span class="badge badge-${m.status === 'active' ? 'active' : 'on-hold'}" style="margin-left:0.5rem;">${m.status}</span>
      </td>
      <td><strong>₹${formatNumberIndian(paidSum)}</strong></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openRecordPaymentModal('${m._id}')">Pay</button>
        <button class="action-btn delete-action" onclick="deleteTeamMemberRecord('${m._id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

window.deleteTeamMemberRecord = async function(id) {
  if (!confirm('Are you sure you want to remove this member?')) return;
  try {
    await window.teamAPI.delete(id);
    showToast('Team member removed', 'success');
    await loadAllData();
    renderTeamModule();
  } catch (err) {
    showToast('Failed to remove team member', 'error');
  }
};

// --- View 11: Client Portal View ---
function renderClientPortal(data) {
  // Brand title
  document.getElementById('client-portal-title').textContent = `${data.client.company || data.client.name} Cabinet`;
  
  // Projects
  const projsList = document.getElementById('client-portal-projects');
  projsList.innerHTML = '';
  if (data.projects.length === 0) {
    projsList.innerHTML = `<div class="text-center py-4 text-muted">No active projects assigned.</div>`;
  } else {
    data.projects.forEach(p => {
      const doneTasks = p.tasks.filter(t => t.status === 'done').length;
      const progress = p.tasks.length > 0 ? Math.round((doneTasks / p.tasks.length) * 100) : 0;
      
      const div = document.createElement('div');
      div.style.border = '1px solid var(--border-color)';
      div.style.borderRadius = '8px';
      div.style.padding = '1rem';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <strong>${escapeHTML(p.name)}</strong>
          <span class="badge badge-${p.status}">${p.status}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">Tasks Progress: ${doneTasks}/${p.tasks.length} completed</div>
        <div style="width:100%; height:6px; background-color:#e5e7eb; border-radius:3px; overflow:hidden;">
          <div style="width:${progress}%; height:100%; background-color:var(--primary);"></div>
        </div>
        ${p.status === 'done' ? `<button class="btn btn-secondary btn-sm mt-4" style="width:100%; border-radius:6px;" onclick="openReviewSubmissionModal('${data.client._id}', '${p._id}')">Leave Project Review</button>` : ''}
      `;
      projsList.appendChild(div);
    });
  }

  // Proposals
  const propsList = document.getElementById('client-portal-proposals');
  propsList.innerHTML = '';
  if (data.proposals.length === 0) {
    propsList.innerHTML = `<div class="text-center py-4 text-muted">No pending proposals.</div>`;
  } else {
    data.proposals.forEach(p => {
      const div = document.createElement('div');
      div.style.border = '1px solid var(--border-color)';
      div.style.borderRadius = '8px';
      div.style.padding = '1rem';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <strong>${escapeHTML(p.title)}</strong>
          <span class="badge badge-${p.status}">${p.status}</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-bottom:1rem;">${escapeHTML(p.content.substring(0, 120))}...</p>
        <button class="btn btn-primary btn-sm" style="width:100%; border-radius:6px;" onclick="viewAndSignProposalPortal('${p._id}')">
          ${p.status === 'signed' ? 'View Agreement' : 'Review & Sign Digitally'}
        </button>
      `;
      propsList.appendChild(div);
    });
  }

  // Invoices
  const invsList = document.getElementById('client-portal-invoices');
  invsList.innerHTML = '';
  if (data.invoices.length === 0) {
    invsList.innerHTML = `<div class="text-center py-4 text-muted">No pending bills.</div>`;
  } else {
    data.invoices.forEach(i => {
      const div = document.createElement('div');
      div.style.border = '1px solid var(--border-color)';
      div.style.borderRadius = '8px';
      div.style.padding = '1rem';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <strong>${i.invoiceNumber} (${i.type.toUpperCase()})</strong>
          <span class="badge badge-${i.status}">${i.status}</span>
        </div>
        <div style="font-size:1.1rem; font-weight:800; margin-bottom:0.75rem;">₹${formatNumberIndian(i.totalAmount)}</div>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-secondary btn-sm" style="flex:1; border-radius:6px;" onclick="printInvoiceDocument('${i._id}')">Print PDF</button>
          ${i.status === 'sent' ? `<button class="btn btn-primary btn-sm" style="flex:1; border-radius:6px;" onclick="payInvoicePortal('${i._id}')">Pay Now</button>` : ''}
        </div>
      `;
      invsList.appendChild(div);
    });
  }

  // Intake Forms
  const formsList = document.getElementById('client-portal-intakes');
  formsList.innerHTML = '';
  if (data.intakeForms.length === 0) {
    formsList.innerHTML = `<div class="text-center py-4 text-muted">No pending onboarding questionnaires.</div>`;
  } else {
    data.intakeForms.forEach(f => {
      const publicUrl = `${window.location.origin}/?intake=${f.token}`;
      const div = document.createElement('div');
      div.style.border = '1px solid var(--border-color)';
      div.style.borderRadius = '8px';
      div.style.padding = '1rem';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <strong>${escapeHTML(f.title)}</strong>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">${escapeHTML(f.description || 'Onboarding questions.')}</p>
        <a href="${publicUrl}" target="_blank" class="btn btn-secondary btn-sm" style="width:100%; border-radius:6px; display:block; text-align:center;">Fill Intake Questionnaire</a>
      `;
      formsList.appendChild(div);
    });
  }
}

window.payInvoicePortal = async function(id) {
  try {
    await window.portalAPI.payInvoice(id);
    showToast('Invoice marked as Paid! Mock transfer completed.', 'success');
    await loadPortalData();
  } catch (err) {
    showToast('Failed to pay invoice', 'error');
  }
};

window.viewAndSignProposalPortal = function(id) {
  const proposal = state.portalData.proposals.find(p => p._id === id);
  if (!proposal) return;

  const content = document.createElement('div');
  content.style.textAlign = 'left';
  content.innerHTML = `
    <h3 style="font-family:var(--font-display); margin-bottom:1rem;">${escapeHTML(proposal.title)}</h3>
    <div style="white-space:pre-wrap; border:1px solid var(--border-color); border-radius:8px; padding:1.25rem; background-color:white; font-size:0.9rem; line-height:1.6; margin-bottom:1.5rem;">${escapeHTML(proposal.content)}</div>
    <h4 style="font-family:var(--font-display); margin-bottom:0.5rem;">Terms & Conditions</h4>
    <div style="white-space:pre-wrap; font-size:0.8rem; color:var(--text-muted); margin-bottom:1.5rem;">${escapeHTML(proposal.terms || 'Standard payment terms apply.')}</div>
    
    ${proposal.status === 'signed' ? `
      <div style="border: 2px solid var(--success); border-radius:8px; padding:1rem; background-color:var(--success-alpha); margin-top:1.5rem;">
        <div style="font-weight:700; color:var(--success); margin-bottom:0.5rem;">SIGNED AGREEMENT</div>
        <div style="font-size:0.85rem;">Signed by: <strong>${escapeHTML(proposal.signature.signedBy)}</strong></div>
        <div style="font-size:0.85rem;">Date: <strong>${new Date(proposal.signature.signedAt).toLocaleString()}</strong></div>
        <div style="font-size:0.85rem;">IP Address: <strong>${proposal.signature.ipAddress}</strong></div>
        <img src="${proposal.signature.signatureData}" style="max-height:80px; display:block; margin-top:0.75rem; border:1px solid #ccc; background:#fff;" />
      </div>
    ` : `
      <button class="btn btn-primary" onclick="openSignatureModal('${proposal._id}')" style="width:100%;">Agree & Apply E-Signature</button>
    `}
  `;

  const viewer = document.getElementById('preview-viewer-container');
  viewer.innerHTML = '';
  viewer.appendChild(content);

  document.getElementById('preview-title').textContent = 'Document Agreement';
  document.getElementById('preview-category').textContent = 'Proposal';
  document.getElementById('preview-details').textContent = proposal.status;
  document.getElementById('preview-date').textContent = new Date(proposal.createdAt).toLocaleDateString();
  document.getElementById('preview-desc').textContent = proposal.title;

  document.getElementById('preview-modal').classList.add('active');
  lucide.createIcons();
};

// --- View 12: Public Intake Form ---
async function loadPublicIntakeForm(token) {
  try {
    const res = await window.intakeAPI.getPublic(token);
    const form = res.data;
    
    document.getElementById('public-intake-title').textContent = form.title;
    document.getElementById('public-intake-desc').textContent = form.description || 'Please provide onboarding details below.';
    
    const container = document.getElementById('public-intake-fields-container');
    container.innerHTML = '';
    
    form.fields.forEach((field, index) => {
      const group = document.createElement('div');
      group.className = 'form-group';
      
      const labelEl = document.createElement('label');
      labelEl.className = field.required ? 'required-label' : '';
      labelEl.textContent = field.label;
      group.appendChild(labelEl);
      
      let inputEl;
      if (field.type === 'text') {
        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.placeholder = 'Your answer...';
      } else if (field.type === 'textarea') {
        inputEl = document.createElement('textarea');
        inputEl.rows = 4;
        inputEl.placeholder = 'Write here...';
      } else if (field.type === 'checkbox') {
        group.innerHTML = ''; // rebuild for clean checkbox layout
        inputEl = document.createElement('input');
        inputEl.type = 'checkbox';
        inputEl.style.width = '18px';
        inputEl.style.height = '18px';
        inputEl.style.accentColor = 'var(--primary)';
        
        const labelCheck = document.createElement('label');
        labelCheck.className = `checkbox-label ${field.required ? 'required-label' : ''}`;
        labelCheck.appendChild(inputEl);
        
        const textSpan = document.createElement('span');
        textSpan.textContent = ` ${field.label}`;
        labelCheck.appendChild(textSpan);
        
        group.appendChild(labelCheck);
      }
      
      if (inputEl) {
        inputEl.id = `public-field-${index}`;
        inputEl.name = `field-${index}`;
        inputEl.setAttribute('data-label', field.label);
        if (field.required) inputEl.required = true;
        
        if (field.type !== 'checkbox') {
          group.appendChild(inputEl);
        }
      }
      container.appendChild(group);
    });

    // Form submit listener
    const submitForm = document.getElementById('public-intake-form-el');
    submitForm.onsubmit = async (e) => {
      e.preventDefault();
      const answers = [];
      form.fields.forEach((field, index) => {
        const el = document.getElementById(`public-field-${index}`);
        let value = '';
        if (field.type === 'checkbox') {
          value = el.checked ? 'Checked/Yes' : 'Unchecked/No';
        } else {
          value = el.value.trim();
        }
        answers.push({ label: field.label, value });
      });

      try {
        await window.intakeAPI.submitPublic(token, answers);
        document.querySelector('.public-form-body').innerHTML = `
          <div style="text-align:center; padding: 2rem 0;">
            <i data-lucide="check-circle" style="width:48px;height:48px;color:var(--success);margin-bottom:1rem;"></i>
            <h2 style="font-family:var(--font-display);margin-bottom:0.5rem;">Form Submitted!</h2>
            <p class="text-muted">Thank you. Your responses have been successfully shared and logged inside the cabinet vault.</p>
          </div>
        `;
        lucide.createIcons();
      } catch (err) {
        showToast('Failed to submit onboarding form', 'error');
      }
    };

  } catch (err) {
    document.querySelector('.public-form-body').innerHTML = `
      <div style="text-align:center; padding: 2rem 0; color:var(--danger);">
        <i data-lucide="alert-triangle" style="width:48px;height:48px;margin-bottom:1rem;"></i>
        <h2>Failed to load Form</h2>
        <p class="text-muted">The link may be invalid, token expired, or client folder deleted.</p>
      </div>
    `;
    lucide.createIcons();
  }
}

// --- View 13: Public Reviews Testimonials ---
async function loadPublicReviewsPortfolio(userId) {
  try {
    const res = await window.reviewAPI.getPublicForUser(userId);
    const list = res.data || [];
    
    const feed = document.getElementById('public-portfolio-feed');
    feed.innerHTML = '';

    if (list.length === 0) {
      feed.innerHTML = `<div class="card" style="text-align:center;"><p class="text-muted">No testimonials received yet.</p></div>`;
      return;
    }

    // Set header avg
    const sum = list.reduce((val, r) => val + r.rating, 0);
    const avg = parseFloat((sum / list.length).toFixed(1));
    document.getElementById('public-portfolio-avg').textContent = `${avg} / 5.0 Rating (${list.length} Reviews)`;
    document.getElementById('public-portfolio-stars').textContent = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));

    list.forEach(r => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:center;">
          <div>
            <strong>${escapeHTML(r.client ? r.client.name : 'Verified Client')}</strong>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.5rem;">${escapeHTML(r.client && r.client.company ? r.client.company : '')}</span>
          </div>
          <div style="color:var(--warning); font-size:1.1rem;">${stars}</div>
        </div>
        <p style="font-size:0.85rem; line-height:1.5;">"${escapeHTML(r.feedback)}"</p>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.75rem;">Verified testimonial of completed project</div>
      `;
      feed.appendChild(div);
    });
  } catch (err) {
    document.getElementById('public-portfolio-feed').innerHTML = `<div class="card" style="text-align:center;"><p class="text-danger">Failed to load public review feed.</p></div>`;
  }
}

// --- Dynamic Modal Controls ---
window.openModal = function(id) {
  document.getElementById(id).classList.add('active');
};

window.closeModal = function(id) {
  document.getElementById(id).classList.remove('active');
};

// --- Add/Edit Clients ---
function setupClientModalListeners() {
  document.getElementById('btn-new-client').addEventListener('click', () => {
    document.getElementById('client-form').reset();
    document.getElementById('client-form-id').value = '';
    document.getElementById('client-modal-title').textContent = 'Create Folder Vault';
    document.getElementById('client-status').value = 'active';
    document.getElementById('client-lead-fields').style.display = 'none';
    document.getElementById('client-value-field').style.display = 'none';
    openModal('client-modal');
  });

  document.getElementById('btn-new-lead').addEventListener('click', () => {
    document.getElementById('client-form').reset();
    document.getElementById('client-form-id').value = '';
    document.getElementById('client-modal-title').textContent = 'Create CRM Lead';
    document.getElementById('client-status').value = 'lead';
    document.getElementById('client-lead-stage').value = 'new';
    document.getElementById('client-lead-fields').style.display = 'block';
    document.getElementById('client-value-field').style.display = 'block';
    openModal('client-modal');
  });

  document.getElementById('client-status').addEventListener('change', (e) => {
    const isLead = e.target.value === 'lead';
    document.getElementById('client-lead-fields').style.display = isLead ? 'block' : 'none';
    document.getElementById('client-value-field').style.display = isLead ? 'block' : 'none';
  });

  document.getElementById('client-modal-cancel').addEventListener('click', () => closeModal('client-modal'));
  document.getElementById('client-modal-close').addEventListener('click', () => closeModal('client-modal'));
  
  document.getElementById('btn-edit-client').addEventListener('click', () => {
    const client = state.clients.find(c => c._id === state.selectedClientId);
    if (!client) return;

    document.getElementById('client-form-id').value = client._id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-company').value = client.company || '';
    document.getElementById('client-email').value = client.email;
    document.getElementById('client-phone').value = client.phone || '';
    document.getElementById('client-status').value = client.status;
    document.getElementById('client-lead-stage').value = client.leadStage || 'none';
    document.getElementById('client-lead-value').value = client.leadValue || 0;
    document.getElementById('client-website').value = client.website || '';
    document.getElementById('client-notes').value = client.notes || '';
    document.getElementById('client-tags').value = client.tags ? client.tags.join(', ') : '';

    if (client.address) {
      document.getElementById('client-street').value = client.address.street || '';
      document.getElementById('client-city').value = client.address.city || '';
      document.getElementById('client-state').value = client.address.state || '';
      document.getElementById('client-zip').value = client.address.zipCode || '';
      document.getElementById('client-country').value = client.address.country || '';
    }

    const isLead = client.status === 'lead';
    document.getElementById('client-lead-fields').style.display = isLead ? 'block' : 'none';
    document.getElementById('client-value-field').style.display = isLead ? 'block' : 'none';

    document.getElementById('client-modal-title').textContent = 'Edit Client Folder';
    closeFolderDrawer();
    openModal('client-modal');
  });

  document.getElementById('btn-delete-client').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to permanently delete this client folder directory? All documents, projects, and invoices inside will be lost!')) return;
    try {
      await window.clientAPI.delete(state.selectedClientId);
      showToast('Folder directory deleted', 'success');
      closeFolderDrawer();
      await loadAllData();
      if (state.activeView === 'clients') renderClientsVault();
      if (state.activeView === 'leads') renderLeadsPipeline();
    } catch (err) {
      showToast('Failed to delete folder directory', 'error');
    }
  });

  document.getElementById('client-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('client-form-id').value;
    const tagsVal = document.getElementById('client-tags').value;
    const tags = tagsVal ? tagsVal.split(',').map(t => t.trim()).filter(Boolean) : [];

    const payload = {
      name: document.getElementById('client-name').value.trim(),
      company: document.getElementById('client-company').value.trim(),
      email: document.getElementById('client-email').value.trim(),
      phone: document.getElementById('client-phone').value.trim(),
      status: document.getElementById('client-status').value,
      leadStage: document.getElementById('client-lead-stage').value,
      leadValue: parseFloat(document.getElementById('client-lead-value').value) || 0,
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
        await window.clientAPI.update(id, payload);
        showToast('Folder vault updated successfully', 'success');
      } else {
        await window.clientAPI.create(payload);
        showToast('New Folder Vault created', 'success');
      }
      closeModal('client-modal');
      await loadAllData();
      if (state.activeView === 'clients') renderClientsVault();
      if (state.activeView === 'leads') renderLeadsPipeline();
    } catch (err) {
      showToast(err.message || 'Failed to submit form', 'error');
    }
  });
}

// --- Uploading Files ---
function setupDocumentModalListeners() {
  document.getElementById('btn-upload-file').addEventListener('click', () => {
    document.getElementById('document-form').reset();
    resetUploadedFile();
    document.getElementById('doc-client').value = state.selectedClientId;
    closeFolderDrawer();
    openModal('document-modal');
  });

  document.getElementById('document-modal-close').addEventListener('click', () => closeModal('document-modal'));
  document.getElementById('document-modal-cancel').addEventListener('click', () => closeModal('document-modal'));
  
  document.getElementById('document-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.selectedFile) {
      showToast('Please select a file first.', 'warning');
      return;
    }

    const tagsVal = document.getElementById('doc-tags').value;
    const tags = tagsVal ? tagsVal.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Construct FormData.
    // IMPORTANT: Append metadata fields BEFORE appending the file so that
    // req.body.category is populated when the storage engine processes the stream.
    const formData = new FormData();
    formData.append('client', document.getElementById('doc-client').value);
    formData.append('name', document.getElementById('doc-name').value.trim());
    formData.append('category', document.getElementById('doc-category').value);
    formData.append('description', document.getElementById('doc-description').value.trim());
    formData.append('isPublic', document.getElementById('doc-is-public').checked);
    
    tags.forEach(tag => {
      formData.append('tags', tag);
    });

    formData.append('file', state.selectedFile);

    try {
      await window.documentAPI.create(formData);
      showToast('File uploaded and filed in drawer pocket!', 'success');
      closeModal('document-modal');
      await loadAllData();
      if (state.selectedClientId) {
        openFolderDrawer(state.selectedClientId);
      }
    } catch (err) {
      showToast('Failed to save file details', 'error');
    }
  });
}

function setupDragAndDrop() {
  const zone = document.getElementById('file-drop-zone');
  const input = document.getElementById('doc-file-input');
  const removeBtn = document.getElementById('btn-remove-selected-file');

  if (!zone) return;
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

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUploadedFile();
  });
}

function handleSelectedFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('Files must be under 10MB.', 'warning');
    return;
  }

  document.getElementById('file-drop-zone').style.display = 'none';
  document.getElementById('selected-file-details').style.display = 'flex';
  document.getElementById('selected-file-name').textContent = file.name;
  document.getElementById('selected-file-size').textContent = formatBytes(file.size);

  const docNameInput = document.getElementById('doc-name');
  if (!docNameInput.value) {
    const extIndex = file.name.lastIndexOf('.');
    docNameInput.value = extIndex > 0 ? file.name.substring(0, extIndex) : file.name;
  }

  state.selectedFile = file;
}

function resetUploadedFile() {
  document.getElementById('doc-file-input').value = '';
  state.selectedFile = null;
  
  document.getElementById('file-drop-zone').style.display = 'flex';
  document.getElementById('selected-file-details').style.display = 'none';
}

window.deleteDocument = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this file?')) return;
  try {
    await window.documentAPI.delete(id);
    showToast('File deleted', 'success');
    await loadAllData();
    if (state.selectedClientId) renderFolderDrawer();
  } catch (err) {
    showToast('Failed to delete file', 'error');
  }
};

window.previewDocument = async function(docId) {
  // Can find in either state.documents or state.portalData
  let doc = state.documents.find(d => d._id === docId);
  if (!doc && state.portalData) {
    // Check in portal docs
    const client = state.portalData.client;
    // Map simulated documents if needed or query API.
  }
  
  if (!doc) {
    // If not found in developer state, download details
    return;
  }

  document.getElementById('preview-title').textContent = doc.name;
  document.getElementById('preview-category').textContent = doc.category;
  document.getElementById('preview-category').className = `badge badge-${doc.category}`;
  document.getElementById('preview-details').textContent = `${doc.fileType} • ${formatBytes(doc.fileSize)}`;
  document.getElementById('preview-date').textContent = new Date(doc.uploadedAt).toLocaleString();
  document.getElementById('preview-desc').textContent = doc.description || 'No description.';

  const downloadBtn = document.getElementById('preview-download-btn');
  downloadBtn.href = safeExternalUrl(doc.fileUrl);
  downloadBtn.setAttribute('download', doc.name);

  const container = document.getElementById('preview-viewer-container');
  container.innerHTML = '';
  const type = doc.fileType.toLowerCase();

  if (type.includes('image')) {
    const img = document.createElement('img');
    img.src = safeExternalUrl(doc.fileUrl);
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    container.appendChild(img);
  } else if (type.includes('pdf')) {
    const iframe = document.createElement('iframe');
    iframe.src = safeExternalUrl(doc.fileUrl);
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    container.appendChild(iframe);
  } else if (type.includes('text') || type.includes('json') || type.includes('javascript') || type.includes('html')) {
    try {
      let text = '';
      if (doc.fileUrl.startsWith('data:')) {
        const base64Data = doc.fileUrl.split(',')[1];
        text = atob(base64Data);
      } else {
        const res = await fetch(safeExternalUrl(doc.fileUrl));
        text = await res.text();
      }
      const pre = document.createElement('pre');
      pre.style.textAlign = 'left';
      pre.style.fontSize = '0.8rem';
      pre.style.padding = '0.5rem';
      pre.textContent = text;
      container.appendChild(pre);
    } catch (e) {
      container.innerHTML = `<p class="text-muted">No text preview available.</p>`;
    }
  } else {
    container.innerHTML = `
      <div style="padding:2rem 0;">
        <i data-lucide="file" style="width:40px;height:40px;margin-bottom:0.5rem;color:var(--primary);"></i>
        <h3>No Browser Preview</h3>
        <p class="text-muted" style="font-size:0.8rem;margin-bottom:1rem;">Click download to view this format locally.</p>
        <a href="${safeExternalUrl(doc.fileUrl)}" download="${escapeHTML(doc.name)}" class="btn btn-primary btn-sm">Download File</a>
      </div>
    `;
  }

  openModal('preview-modal');
  lucide.createIcons();
};

document.getElementById('preview-modal-close').addEventListener('click', () => closeModal('preview-modal'));

// --- Projects CRUD ---
function setupProjectModalListeners() {
  document.getElementById('btn-new-project').addEventListener('click', () => {
    document.getElementById('project-form').reset();
    document.getElementById('project-form-id').value = '';
    document.getElementById('project-modal-title').textContent = 'New Project';
    
    // Fill client select
    populateClientSelect('project-client-select');
    openModal('project-modal');
  });

  document.getElementById('btn-edit-project-details').addEventListener('click', () => {
    const proj = state.projects.find(p => p._id === state.activeProjectId);
    if (!proj) return;

    document.getElementById('project-form-id').value = proj._id;
    populateClientSelect('project-client-select', proj.client ? proj.client._id : '');
    document.getElementById('project-name').value = proj.name;
    document.getElementById('project-desc').value = proj.description || '';
    document.getElementById('project-budget').value = proj.budget || 0;
    document.getElementById('project-deadline').value = proj.deadline ? proj.deadline.substring(0, 10) : '';
    document.getElementById('project-status-select').value = proj.status;

    document.getElementById('project-modal-title').textContent = 'Edit Project Details';
    openModal('project-modal');
  });

  document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('project-form-id').value;

    const payload = {
      client: document.getElementById('project-client-select').value,
      name: document.getElementById('project-name').value.trim(),
      description: document.getElementById('project-desc').value.trim(),
      budget: parseFloat(document.getElementById('project-budget').value) || 0,
      deadline: document.getElementById('project-deadline').value || null,
      status: document.getElementById('project-status-select').value
    };

    try {
      if (id) {
        await window.projectAPI.update(id, payload);
        showToast('Project updated', 'success');
      } else {
        await window.projectAPI.create(payload);
        showToast('Project created', 'success');
      }
      closeModal('project-modal');
      await loadAllData();
      renderProjectsModule();
    } catch (err) {
      showToast('Failed to save project', 'error');
    }
  });

  window.toggleActiveProjectComplete = async function() {
    const activeProj = state.projects.find(p => p._id === state.activeProjectId);
    if (!activeProj) return;

    const newStatus = activeProj.status === 'done' ? 'doing' : 'done';
    try {
      await window.projectAPI.update(activeProj._id, { status: newStatus });
      showToast(newStatus === 'done' ? 'Project marked as Completed!' : 'Project reopened.', 'success');
      await loadAllData();
      renderProjectsModule();
    } catch (err) {
      showToast('Failed to update project status', 'error');
    }
  };

  // Task item modal inside project
  document.getElementById('btn-add-proj-task').addEventListener('click', () => {
    document.getElementById('task-form').reset();
    document.getElementById('task-project-id').value = state.activeProjectId;
    document.getElementById('task-index-id').value = '';
    
    // Fill team members select
    const teamSel = document.getElementById('task-assignee');
    teamSel.innerHTML = '<option value="">Unassigned</option>' + state.teamMembers.map(m => `<option value="${escapeHTML(m.name)}">${escapeHTML(m.name)} (${escapeHTML(m.role)})</option>`).join('');

    openModal('task-modal');
  });

  document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const projId = document.getElementById('task-project-id').value;
    const taskName = document.getElementById('task-name').value.trim();
    const assignee = document.getElementById('task-assignee').value;
    const status = document.getElementById('task-status-select').value;

    const proj = state.projects.find(p => p._id === projId);
    if (!proj) return;

    proj.tasks.push({ name: taskName, assignedTo: assignee, status });

    try {
      await window.projectAPI.update(projId, { tasks: proj.tasks });
      showToast('Task added to project board', 'success');
      closeModal('task-modal');
      await loadAllData();
      renderProjectsModule();
    } catch (err) {
      showToast('Failed to add task', 'error');
    }
  });
}

function populateClientSelect(selectId, selectedId = '') {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="" disabled selected>Select Client...</option>' + 
    state.clients.map(c => `<option value="${escapeHTML(c._id)}" ${c._id === selectedId ? 'selected' : ''}>${escapeHTML(c.name)} (${escapeHTML(c.company || 'Private')})</option>`).join('');
}

// --- Smart Invoices Creator & Calculator ---
let invoiceItemsCount = 0;
function setupInvoiceModalListeners() {
  document.getElementById('btn-new-invoice').addEventListener('click', () => {
    document.getElementById('invoice-form').reset();
    document.getElementById('invoice-form-id').value = '';
    document.getElementById('invoice-modal-title').textContent = 'Create Smart Document';
    
    populateClientSelect('invoice-client-select');
    document.getElementById('invoice-items-rows-container').innerHTML = '';
    invoiceItemsCount = 0;
    addInvoiceItemRow(); // start with 1 item row
    recalcInvoiceTotals();
    openModal('invoice-modal');
  });

  document.getElementById('invoice-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('invoice-form-id').value;
    
    // Build items payload
    const items = [];
    for(let idx = 0; idx < invoiceItemsCount; idx++) {
      const descInput = document.getElementById(`inv-item-desc-${idx}`);
      if (!descInput) continue;
      
      const qtyVal = parseFloat(document.getElementById(`inv-item-qty-${idx}`).value) || 0;
      const rateVal = parseFloat(document.getElementById(`inv-item-rate-${idx}`).value) || 0;
      
      items.push({
        description: descInput.value.trim(),
        qty: qtyVal,
        rate: rateVal,
        amount: qtyVal * rateVal
      });
    }

    if (items.length === 0) {
      showToast('Please add at least 1 item.', 'warning');
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = parseFloat(document.getElementById('invoice-tax-rate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const payload = {
      client: document.getElementById('invoice-client-select').value,
      type: document.getElementById('invoice-type').value,
      invoiceNumber: document.getElementById('invoice-number').value.trim(),
      status: document.getElementById('invoice-status').value,
      issueDate: document.getElementById('invoice-issue-date').value || new Date(),
      dueDate: document.getElementById('invoice-due-date').value || null,
      items,
      taxRate,
      taxAmount,
      totalAmount,
      notes: document.getElementById('invoice-notes').value.trim()
    };

    try {
      if (id) {
        await window.invoiceAPI.update(id, payload);
        showToast('Document updated', 'success');
      } else {
        await window.invoiceAPI.create(payload);
        showToast('Smart Document created!', 'success');
      }
      closeModal('invoice-modal');
      await loadAllData();
      renderInvoicesModule();
    } catch (err) {
      showToast('Failed to save document', 'error');
    }
  });
}

window.addInvoiceItemRow = function() {
  const container = document.getElementById('invoice-items-rows-container');
  const index = invoiceItemsCount++;
  
  const tr = document.createElement('tr');
  tr.id = `inv-item-row-${index}`;
  tr.innerHTML = `
    <td><input type="text" id="inv-item-desc-${index}" required placeholder="Service/Product details..."></td>
    <td><input type="number" id="inv-item-qty-${index}" value="1" min="1" style="text-align:right;" oninput="updateInvoiceRowSum(${index})"></td>
    <td><input type="number" id="inv-item-rate-${index}" value="0" min="0" style="text-align:right;" oninput="updateInvoiceRowSum(${index})"></td>
    <td style="text-align:right; font-weight:600;" id="inv-item-amount-${index}">₹0.00</td>
    <td>
      <button type="button" class="action-btn delete-action" onclick="removeInvoiceItemRow(${index})">
        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
      </button>
    </td>
  `;
  container.appendChild(tr);
  lucide.createIcons();
};

window.removeInvoiceItemRow = function(index) {
  const row = document.getElementById(`inv-item-row-${index}`);
  if (row) {
    row.remove();
    recalcInvoiceTotals();
  }
};

window.updateInvoiceRowSum = function(index) {
  const qty = parseFloat(document.getElementById(`inv-item-qty-${index}`).value) || 0;
  const rate = parseFloat(document.getElementById(`inv-item-rate-${index}`).value) || 0;
  document.getElementById(`inv-item-amount-${index}`).textContent = `₹${formatNumberIndian(qty * rate)}`;
  recalcInvoiceTotals();
};

window.recalcInvoiceTotals = function() {
  let subtotal = 0;
  for(let idx = 0; idx < invoiceItemsCount; idx++) {
    const descEl = document.getElementById(`inv-item-desc-${idx}`);
    if (!descEl) continue;
    
    const qty = parseFloat(document.getElementById(`inv-item-qty-${idx}`).value) || 0;
    const rate = parseFloat(document.getElementById(`inv-item-rate-${idx}`).value) || 0;
    subtotal += qty * rate;
  }

  const taxRate = parseFloat(document.getElementById('invoice-tax-rate').value) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  document.getElementById('invoice-calc-subtotal').textContent = `₹${formatNumberIndian(subtotal)}`;
  document.getElementById('invoice-calc-tax').textContent = `₹${formatNumberIndian(taxAmount)}`;
  document.getElementById('invoice-calc-total').textContent = `₹${formatNumberIndian(total)}`;
};

window.openInvoiceEdit = function(id) {
  const inv = state.invoices.find(i => i._id === id);
  if (!inv) return;

  document.getElementById('invoice-form-id').value = inv._id;
  populateClientSelect('invoice-client-select', inv.client ? inv.client._id : '');
  document.getElementById('invoice-type').value = inv.type;
  document.getElementById('invoice-number').value = inv.invoiceNumber;
  document.getElementById('invoice-status').value = inv.status;
  document.getElementById('invoice-issue-date').value = inv.issueDate ? inv.issueDate.substring(0, 10) : '';
  document.getElementById('invoice-due-date').value = inv.dueDate ? inv.dueDate.substring(0, 10) : '';
  document.getElementById('invoice-tax-rate').value = inv.taxRate;
  document.getElementById('invoice-notes').value = inv.notes || '';

  const container = document.getElementById('invoice-items-rows-container');
  container.innerHTML = '';
  invoiceItemsCount = 0;

  inv.items.forEach(item => {
    const index = invoiceItemsCount++;
    const tr = document.createElement('tr');
    tr.id = `inv-item-row-${index}`;
    tr.innerHTML = `
      <td><input type="text" id="inv-item-desc-${index}" required value="${escapeHTML(item.description)}"></td>
      <td><input type="number" id="inv-item-qty-${index}" value="${item.qty}" min="1" style="text-align:right;" oninput="updateInvoiceRowSum(${index})"></td>
      <td><input type="number" id="inv-item-rate-${index}" value="${item.rate}" min="0" style="text-align:right;" oninput="updateInvoiceRowSum(${index})"></td>
      <td style="text-align:right; font-weight:600;" id="inv-item-amount-${index}">₹${formatNumberIndian(item.qty * item.rate)}</td>
      <td>
        <button type="button" class="action-btn delete-action" onclick="removeInvoiceItemRow(${index})">
          <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
        </button>
      </td>
    `;
    container.appendChild(tr);
  });

  recalcInvoiceTotals();
  document.getElementById('invoice-modal-title').textContent = 'Edit Smart Document';
  openModal('invoice-modal');
  lucide.createIcons();
};

// Print PDF styled template
window.printInvoiceDocument = function(invoiceId) {
  let invoice = state.invoices.find(i => i._id === invoiceId);
  if (!invoice && state.portalData) {
    invoice = state.portalData.invoices.find(i => i._id === invoiceId);
  }
  
  if (!invoice) return;

  const client = invoice.client || { name: 'Private Client', company: '', address: {} };
  
  document.getElementById('print-invoice-num').textContent = `${invoice.type.toUpperCase()}: ${invoice.invoiceNumber}`;
  document.getElementById('print-developer-name').textContent = state.user ? state.user.name : 'Cabinet Agency';
  document.getElementById('print-developer-email').textContent = state.user ? state.user.email : 'billing@agency.com';
  
  document.getElementById('print-client-name').textContent = client.name;
  document.getElementById('print-client-company').textContent = client.company || '';
  
  let address = '—';
  if (client.address && (client.address.street || client.address.city)) {
    address = [client.address.street, client.address.city, client.address.state, client.address.country].filter(Boolean).join(', ');
  }
  document.getElementById('print-client-address').textContent = address;
  
  document.getElementById('print-date-issue').textContent = new Date(invoice.issueDate).toLocaleDateString();
  document.getElementById('print-date-due').textContent = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt';

  const tbody = document.getElementById('print-items-body');
  tbody.innerHTML = invoice.items.map(item => `
    <tr>
      <td>${escapeHTML(item.description)}</td>
      <td style="text-align: right;">${item.qty}</td>
      <td style="text-align: right;">₹${formatNumberIndian(item.rate)}</td>
      <td style="text-align: right; font-weight:600;">₹${formatNumberIndian(item.amount)}</td>
    </tr>
  `).join('');

  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById('print-subtotal').textContent = `₹${formatNumberIndian(subtotal)}`;
  document.getElementById('print-gst').textContent = `₹${formatNumberIndian(invoice.taxAmount)}`;
  document.getElementById('print-total').textContent = `₹${formatNumberIndian(invoice.totalAmount)}`;
  
  document.getElementById('print-notes-area').innerHTML = invoice.notes 
    ? `<strong>Terms & Notes:</strong><p>${escapeHTML(invoice.notes)}</p>` 
    : '';

  window.print();
};

// --- Proposals CRUD ---
function setupProposalModalListeners() {
  document.getElementById('btn-new-proposal').addEventListener('click', () => {
    document.getElementById('proposal-form').reset();
    document.getElementById('proposal-form-id').value = '';
    document.getElementById('proposal-modal-title').textContent = 'New Proposal Layout';
    populateClientSelect('proposal-client-select');
    openModal('proposal-modal');
  });

  document.getElementById('proposal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('proposal-form-id').value;

    const payload = {
      client: document.getElementById('proposal-client-select').value,
      title: document.getElementById('proposal-title').value.trim(),
      content: document.getElementById('proposal-content').value.trim(),
      terms: document.getElementById('proposal-terms').value.trim(),
      status: 'sent'
    };

    try {
      if (id) {
        await window.proposalAPI.update(id, payload);
        showToast('Proposal saved', 'success');
      } else {
        await window.proposalAPI.create(payload);
        showToast('Proposal sent to client portal!', 'success');
      }
      closeModal('proposal-modal');
      await loadAllData();
      renderProposalsModule();
    } catch (err) {
      showToast('Failed to save proposal', 'error');
    }
  });
}

window.openProposalEdit = function(id) {
  const prop = state.proposals.find(p => p._id === id);
  if (!prop) return;

  document.getElementById('proposal-form-id').value = prop._id;
  populateClientSelect('proposal-client-select', prop.client ? prop.client._id : '');
  document.getElementById('proposal-title').value = prop.title;
  document.getElementById('proposal-content').value = prop.content;
  document.getElementById('proposal-terms').value = prop.terms || '';

  document.getElementById('proposal-modal-title').textContent = 'Edit Proposal Template';
  openModal('proposal-modal');
  lucide.createIcons();
};

// --- Intake Forms Configuration ---
let intakeFieldsCount = 0;
function setupIntakeModalListeners() {
  document.getElementById('btn-new-intake').addEventListener('click', () => {
    document.getElementById('intake-form').reset();
    document.getElementById('intake-form-id').value = '';
    document.getElementById('intake-modal-title').textContent = 'Create Intake Form';
    
    populateClientSelect('intake-client-select');
    document.getElementById('intake-fields-rows-container').innerHTML = '';
    intakeFieldsCount = 0;
    addIntakeFieldRow(); // add 1 field by default
    openModal('intake-modal');
  });

  document.getElementById('intake-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('intake-form-id').value;

    const fields = [];
    for(let idx = 0; idx < intakeFieldsCount; idx++) {
      const labelInput = document.getElementById(`intake-field-label-${idx}`);
      if (!labelInput) continue;
      
      fields.push({
        label: labelInput.value.trim(),
        type: document.getElementById(`intake-field-type-${idx}`).value,
        required: document.getElementById(`intake-field-req-${idx}`).checked
      });
    }

    if (fields.length === 0) {
      showToast('Please add at least 1 onboarding question.', 'warning');
      return;
    }

    const payload = {
      client: document.getElementById('intake-client-select').value,
      title: document.getElementById('intake-title').value.trim(),
      description: document.getElementById('intake-desc').value.trim(),
      fields
    };

    try {
      await window.intakeAPI.create(payload);
      showToast('Intake onboarding form published successfully!', 'success');
      closeModal('intake-modal');
      await loadAllData();
      renderIntakesModule();
    } catch (err) {
      showToast('Failed to publish form', 'error');
    }
  });
}

window.addIntakeFieldRow = function() {
  const container = document.getElementById('intake-fields-rows-container');
  const index = intakeFieldsCount++;
  
  const div = document.createElement('div');
  div.id = `intake-field-row-${index}`;
  div.style.display = 'flex';
  div.style.gap = '0.5rem';
  div.style.alignItems = 'center';
  
  div.innerHTML = `
    <input type="text" id="intake-field-label-${index}" required placeholder="Question label..." style="flex:2;">
    <select id="intake-field-type-${index}" style="flex:1;">
      <option value="text">Short Text</option>
      <option value="textarea">Paragraph Description</option>
      <option value="checkbox">Yes/No Checkbox</option>
    </select>
    <label class="checkbox-label" style="flex:0.5; margin:0;">
      <input type="checkbox" id="intake-field-req-${index}" checked>
      <span>Required</span>
    </label>
    <button type="button" class="action-btn delete-action" onclick="removeIntakeFieldRow(${index})">
      <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
    </button>
  `;
  container.appendChild(div);
  lucide.createIcons();
};

window.removeIntakeFieldRow = function(index) {
  const row = document.getElementById(`intake-field-row-${index}`);
  if (row) row.remove();
};

// --- Meetings Schedulers ---
function setupMeetingModalListeners() {
  document.getElementById('btn-new-meeting').addEventListener('click', () => {
    document.getElementById('meeting-form').reset();
    populateClientSelect('meeting-client-select');
    openModal('meeting-modal');
  });

  document.getElementById('meeting-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
      client: document.getElementById('meeting-client-select').value,
      title: document.getElementById('meeting-title').value.trim(),
      description: document.getElementById('meeting-desc').value.trim(),
      startAt: document.getElementById('meeting-start').value,
      endAt: document.getElementById('meeting-end').value
    };

    try {
      await window.meetingAPI.create(payload);
      showToast('Meeting scheduled. Meet links generated.', 'success');
      closeModal('meeting-modal');
      await loadAllData();
      renderMeetingsModule();
    } catch (err) {
      showToast('Failed to schedule meeting', 'error');
    }
  });
}

// Simulated Push Reminders
function setupMeetingReminders(meetings) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Poll every 60 seconds
  setInterval(() => {
    const now = new Date();
    meetings.forEach(m => {
      const start = new Date(m.startAt);
      const diffMs = start - now;
      
      // Trigger notification if meeting starts in less than 5 minutes
      if (diffMs > 0 && diffMs <= 5 * 60 * 1000 && !m.notified) {
        m.notified = true;
        if (Notification.permission === "granted") {
          new Notification(`Sync meeting: ${m.title}`, {
            body: `Starting at ${start.toLocaleTimeString()}. Click to join: ${m.meetLink}`,
            icon: '/logo.png'
          });
        }
      }
    });
  }, 60000);
}

// --- Team Management CRUD ---
function setupTeamModalListeners() {
  document.getElementById('btn-new-team').addEventListener('click', () => {
    document.getElementById('team-form').reset();
    openModal('team-modal');
  });

  document.getElementById('team-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
      name: document.getElementById('team-name').value.trim(),
      email: document.getElementById('team-email').value.trim(),
      role: document.getElementById('team-role').value.trim()
    };

    try {
      await window.teamAPI.create(payload);
      showToast('Team member added', 'success');
      closeModal('team-modal');
      await loadAllData();
      renderTeamModule();
    } catch (err) {
      showToast('Failed to save team member', 'error');
    }
  });

  // Record payments form
  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('payment-member-id').value;
    const amount = parseFloat(document.getElementById('payment-amount').value) || 0;
    const date = document.getElementById('payment-date').value || new Date();
    const notes = document.getElementById('payment-notes').value.trim();

    try {
      await window.teamAPI.recordPayment(id, amount, date, notes);
      showToast('Payment recorded successfully', 'success');
      closeModal('payment-modal');
      await loadAllData();
      renderTeamModule();
    } catch (err) {
      showToast('Failed to record payment', 'error');
    }
  });
}

window.openRecordPaymentModal = function(memberId) {
  document.getElementById('payment-form').reset();
  document.getElementById('payment-member-id').value = memberId;
  document.getElementById('payment-date').value = new Date().toISOString().substring(0, 10);
  openModal('payment-modal');
};

// --- Client Portal Review testimonial submit ---
window.openReviewSubmissionModal = function(clientId, projectId) {
  document.getElementById('review-submission-form').reset();
  document.getElementById('review-client-id').value = clientId;
  document.getElementById('review-project-id').value = projectId;
  
  // Set rating selector logic
  const stars = document.querySelectorAll('.star-rating-star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rate = parseInt(star.getAttribute('data-rating'));
      document.getElementById('review-rating-value').value = rate;
      stars.forEach(s => {
        const sRate = parseInt(s.getAttribute('data-rating'));
        s.style.color = sRate <= rate ? 'var(--warning)' : '#d1d5db';
      });
    });
  });
  
  // click 5 star by default
  stars[4].click();
  openModal('review-submission-modal');
};

document.getElementById('review-submission-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const clientId = document.getElementById('review-client-id').value;
  const projectId = document.getElementById('review-project-id').value;
  const rating = parseInt(document.getElementById('review-rating-value').value);
  const feedback = document.getElementById('review-feedback').value.trim();

  try {
    await window.reviewAPI.submitPublicReview(clientId, projectId, rating, feedback);
    showToast('Verified testimonial submitted. Thank you!', 'success');
    closeModal('review-submission-modal');
    await loadPortalData();
  } catch (err) {
    showToast('Failed to submit review', 'error');
  }
});

// --- Signature Draw Pad using HTML5 Canvas ---
let activeProposalIdToSign = null;
window.openSignatureModal = function(proposalId) {
  activeProposalIdToSign = proposalId;
  document.getElementById('signature-name-input').value = state.portalData.client.name;
  closeModal('preview-modal');
  openModal('signature-modal');
  
  // Reset pad
  clearSignaturePad();
};

function setupSignatureCanvas() {
  const canvas = document.getElementById('sig-pad-canvas');
  if (!canvas) return;
  
  state.sigCanvas = canvas;
  state.sigCtx = canvas.getContext('2d');
  
  // Handle high DPI display sizes
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  state.sigCtx.strokeStyle = '#2c2825';
  state.sigCtx.lineWidth = 2.5;
  state.sigCtx.lineCap = 'round';
  
  // Mouse listeners
  canvas.addEventListener('mousedown', (e) => {
    state.isDrawing = true;
    state.sigCtx.beginPath();
    state.sigCtx.moveTo(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!state.isDrawing) return;
    state.sigCtx.lineTo(e.offsetX, e.offsetY);
    state.sigCtx.stroke();
  });
  canvas.addEventListener('mouseup', () => state.isDrawing = false);
  canvas.addEventListener('mouseleave', () => state.isDrawing = false);
  
  // Touch listeners
  canvas.addEventListener('touchstart', (e) => {
    state.isDrawing = true;
    const touch = e.touches[0];
    const clientRect = canvas.getBoundingClientRect();
    state.sigCtx.beginPath();
    state.sigCtx.moveTo(touch.clientX - clientRect.left, touch.clientY - clientRect.top);
    e.preventDefault();
  });
  canvas.addEventListener('touchmove', (e) => {
    if (!state.isDrawing) return;
    const touch = e.touches[0];
    const clientRect = canvas.getBoundingClientRect();
    state.sigCtx.lineTo(touch.clientX - clientRect.left, touch.clientY - clientRect.top);
    state.sigCtx.stroke();
    e.preventDefault();
  });
  canvas.addEventListener('touchend', () => state.isDrawing = false);
}

window.clearSignaturePad = function() {
  if (!state.sigCanvas) return;
  state.sigCtx.clearRect(0, 0, state.sigCanvas.width, state.sigCanvas.height);
};

window.submitPortalSignature = async function() {
  const name = document.getElementById('signature-name-input').value.trim();
  if (!name) {
    showToast('Name signature is required.', 'warning');
    return;
  }
  
  const canvas = state.sigCanvas;
  const signatureData = canvas.toDataURL('image/png');

  try {
    await window.portalAPI.signProposal(activeProposalIdToSign, signatureData, name);
    showToast('Proposal document digitally signed successfully!', 'success');
    closeModal('signature-modal');
    await loadPortalData();
  } catch (err) {
    showToast('Failed to record signature agreement', 'error');
  }
};

// --- User Authentications Listeners ---
function setupAuthListeners() {
  const tabLogin = DOM.tabLoginBtn;
  const tabRegister = DOM.tabRegisterBtn;
  
  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      DOM.loginForm.classList.add('active');
      DOM.registerForm.classList.remove('active');
    });
    
    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      DOM.registerForm.classList.add('active');
      DOM.loginForm.classList.remove('active');
    });
  }

  DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const isClient = document.getElementById('login-as-client-check').checked;

    try {
      const res = await window.authAPI.login(email, password);
      
      // Verification logic: client checkbox must match user role
      if (isClient && res.data.role !== 'client') {
        showToast('Invalid login. You are registered as developer/admin.', 'warning');
        return;
      }
      if (!isClient && res.data.role === 'client') {
        showToast('Invalid login. Please toggle "Log in as Client" option.', 'warning');
        return;
      }

      localStorage.setItem('token', res.data.token);
      showToast('Authentication approved!', 'success');
      await checkSessionAndRoute();
    } catch (err) {
      showToast(err.message || 'Access denied. Check credentials.', 'error');
    }
  });

  DOM.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;

    try {
      const res = await window.authAPI.register(name, email, password, role);
      localStorage.setItem('token', res.data.token);
      showToast('Registration approved successfully!', 'success');
      await checkSessionAndRoute();
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
    }
  });
}

window.handleTokenExpired = function() {
  logout();
  showToast('Session token expired. Re-authenticate.', 'warning');
};

function logout() {
  localStorage.removeItem('token');
  state.user = null;
  state.clients = [];
  state.documents = [];
  state.projects = [];
  state.invoices = [];
  state.proposals = [];
  state.intakes = [];
  state.meetings = [];
  state.reviews = [];
  state.teamMembers = [];
  state.selectedClientId = null;
  state.activeProjectId = null;
  state.portalData = null;

  // Restore regular sidebar html
  if (DOM.sidebar) {
    const menu = DOM.sidebar.querySelector('.sidebar-menu');
    menu.innerHTML = `
      <div class="menu-item active" data-view="dashboard">
        <i data-lucide="layout-dashboard"></i>
        <span>Dashboard</span>
      </div>
      <div class="menu-item" data-view="leads">
        <i data-lucide="columns-3"></i>
        <span>CRM Leads</span>
      </div>
      <div class="menu-item" data-view="clients">
        <i data-lucide="folder-open"></i>
        <span>Clients Vault</span>
      </div>
      <div class="menu-item" data-view="projects">
        <i data-lucide="kanban-square"></i>
        <span>Projects</span>
      </div>
      <div class="menu-item" data-view="invoices">
        <i data-lucide="receipt-text"></i>
        <span>Invoices & Quotes</span>
      </div>
      <div class="menu-item" data-view="proposals">
        <i data-lucide="file-signature"></i>
        <span>Proposals</span>
      </div>
      <div class="menu-item" data-view="intakes">
        <i data-lucide="file-text"></i>
        <span>Intake Forms</span>
      </div>
      <div class="menu-item" data-view="meetings">
        <i data-lucide="calendar"></i>
        <span>Meetings</span>
      </div>
      <div class="menu-item" data-view="reviews">
        <i data-lucide="badge-check"></i>
        <span>Client Reviews</span>
      </div>
      <div class="menu-item" data-view="team">
        <i data-lucide="users"></i>
        <span>Team Members</span>
      </div>
    `;
    setupDeveloperUI();
  }

  // Restore main header
  const mainHeader = document.querySelector('.main-header');
  if (mainHeader) mainHeader.style.display = 'flex';
  if (DOM.sidebar) DOM.sidebar.style.display = 'flex';

  closeFolderDrawer();
  showLandingPage();

  DOM.loginForm.reset();
  DOM.registerForm.reset();
  DOM.tabLoginBtn.click();
}

// --- Utilities ---
function formatNumberIndian(num) {
  // Simple Indian style formatter: e.g. 2,40,000
  const val = Math.round(num);
  return val.toLocaleString('en-IN');
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    const raw = String(value || '').trim().toLowerCase();
    const isAllowedData =
      raw.startsWith('data:image/') ||
      raw.startsWith('data:application/pdf') ||
      raw.startsWith('data:text/plain');
    if (url.protocol === 'http:' || url.protocol === 'https:' || isAllowedData) {
      return escapeHTML(url.href);
    }
  } catch (error) {}
  return '#';
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function copyTextToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }, () => {
    showToast('Failed to copy text', 'error');
  });
}

function copyBadgeSnippet() {
  const txt = document.getElementById('badge-snippet-code').textContent.trim();
  copyTextToClipboard(txt);
}

function triggerMockDataSync() {
  showToast('Metrics synchronized successfully.', 'success');
  loadAllData().then(() => renderDashboard());
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
  }, 5000);
}

window.switchSimTab = function(tabName) {
  // Toggle tab buttons active class
  document.querySelectorAll('.sim-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabName}'`)) {
      btn.classList.add('active');
    }
  });

  // Toggle views active class
  document.querySelectorAll('.sim-view').forEach(view => {
    view.classList.remove('active');
  });
  
  const targetView = document.getElementById(`sim-view-${tabName}`);
  if (targetView) {
    targetView.classList.add('active');
  }
  
  lucide.createIcons();
};

// --- Theme & Responsive Setup ---
function setupThemeAndResponsive() {
  // Theme selection initialization
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI();

  // Sidebar responsive buttons
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

  // Backdrop overlay container element
  let backdrop = document.getElementById('sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebar-backdrop';
    backdrop.className = 'sidebar-backdrop';
    document.getElementById('app-container').appendChild(backdrop);
  }

  const closeSidebar = () => {
    if (DOM.sidebar) DOM.sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('active');
  };

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => {
      if (DOM.sidebar) DOM.sidebar.classList.add('mobile-open');
      backdrop.classList.add('active');
    });
  }
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', closeSidebar);
  }

  backdrop.addEventListener('click', closeSidebar);

  // Close sidebar on item selection
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      closeSidebar();
    });
  });
}

// Theme toggle functionality
window.toggleTheme = function() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeUI();
};

function updateThemeUI() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
    const sunIcon = btn.querySelector('.theme-icon-sun');
    const moonIcon = btn.querySelector('.theme-icon-moon');
    if (currentTheme === 'light') {
      if (sunIcon) sunIcon.style.display = 'inline-block';
      if (moonIcon) moonIcon.style.display = 'none';
    } else {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'inline-block';
    }
  });
}
