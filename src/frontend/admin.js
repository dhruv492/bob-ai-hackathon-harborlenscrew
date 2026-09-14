/* ---- HarborLens Admin Panel ---- */
const API = '/api/vessels';
const byId = id => document.getElementById(id);
const tbody = byId('admin-body');
const overlay = byId('modal-overlay');
const deleteOverlay = byId('delete-overlay');
const form = byId('vessel-form');
const FIELDS = ['vessel_id', 'eta', 'berth', 'cargo', 'priority', 'dwell', 'cranes', 'utilization'];
const INT_FIELDS = new Set(['dwell', 'cranes', 'utilization']);
let pendingDeleteId = null;

function authHeaders(extra = {}) {
  const token = localStorage.getItem('hl_token');
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

/* ---- Toast notifications ---- */
function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>${message}`;
  byId('toast-container').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}

/* ---- Stats bar ---- */
function renderStats(vessels) {
  const priorities = {};
  vessels.forEach(v => { priorities[v.priority] = (priorities[v.priority] || 0) + 1; });
  const avgUtil = vessels.length ? Math.round(vessels.reduce((s, v) => s + v.utilization, 0) / vessels.length) : 0;
  const totalCranes = vessels.reduce((s, v) => s + v.cranes, 0);
  byId('admin-stats').innerHTML = [
    ['Total vessels', vessels.length, '🚢'],
    ['Avg utilization', `${avgUtil}%`, '📊'],
    ['Total cranes', totalCranes, '🏗️'],
    ['Priority classes', Object.keys(priorities).length, '🔖'],
  ].map(([label, value, icon]) =>
    `<article class="admin-stat"><span class="admin-stat-icon">${icon}</span><div><strong>${value}</strong><span>${label}</span></div></article>`
  ).join('');
  byId('vessel-count').textContent = `${vessels.length} vessel${vessels.length !== 1 ? 's' : ''} registered`;
}

/* ---- Priority badge colors ---- */
function priorityBadge(p) {
  const cls = p === 'Cold chain' ? 'badge-cold' : p === 'Connection-sensitive' ? 'badge-conn' : p === 'High value' ? 'badge-high' : 'badge-std';
  return `<span class="badge ${cls}">${p}</span>`;
}

/* ---- Fetch and render table ---- */
async function loadVessels() {
  try {
    const res = await fetch(API, { headers: authHeaders() });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const vessels = await res.json();
    renderStats(vessels);
    if (!vessels.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><div class="empty-icon">🚢</div><p>No vessels in the fleet yet</p><span class="subtle">Click "+ Add vessel" to register your first vessel</span></td></tr>';
      return;
    }
    tbody.innerHTML = vessels.map(v => `
      <tr class="vessel-row">
        <td><strong class="vessel-name">${v.vessel_id}</strong></td>
        <td><span class="mono">${v.eta}</span></td>
        <td><span class="berth-tag">${v.berth}</span></td>
        <td>${v.cargo}</td>
        <td>${priorityBadge(v.priority)}</td>
        <td><span class="mono">${v.dwell}h</span></td>
        <td>${v.cranes}</td>
        <td>
          <div class="util-bar-wrap">
            <div class="util-bar" style="width:${v.utilization}%"></div>
            <span>${v.utilization}%</span>
          </div>
        </td>
        <td class="action-cell">
          <button class="btn-action btn-edit edit-btn" data-id="${v.id}" title="Edit vessel">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 1.5l3 3L5 14H2v-3z"/><path d="M9.5 3.5l3 3"/></svg>
            Edit
          </button>
          <button class="btn-action btn-del del-btn" data-id="${v.id}" data-name="${v.vessel_id}" title="Delete vessel">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5"/><path d="M3 4l1 10h8l1-10"/></svg>
            Delete
          </button>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEdit(vessels.find(v => v.id === Number(btn.dataset.id)))));
    tbody.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', () => openDelete(Number(btn.dataset.id), btn.dataset.name)));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state" style="color:var(--red)"><div class="empty-icon">⚠️</div><p>Failed to load vessels</p><span class="subtle">${err.message}</span></td></tr>`;
  }
}

/* ---- Modal helpers ---- */
function openModal(title, subtitle, icon) {
  byId('modal-title').textContent = title;
  byId('modal-subtitle').textContent = subtitle;
  byId('modal-icon').textContent = icon || '🚢';
  byId('save-label').textContent = title.startsWith('Edit') ? 'Update vessel' : 'Save vessel';
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('open'));
  byId('f-vessel_id').focus();
}
function closeModal() {
  overlay.classList.remove('open');
  setTimeout(() => { overlay.hidden = true; form.reset(); byId('form-db-id').value = ''; }, 200);
}

/* ---- Add flow ---- */
byId('add-btn').addEventListener('click', () => openModal('Add vessel', 'Enter vessel details to add to the operational fleet.', '🚢'));
byId('cancel-btn').addEventListener('click', closeModal);
byId('close-btn').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

/* ---- Edit flow ---- */
function openEdit(vessel) {
  byId('form-db-id').value = vessel.id;
  FIELDS.forEach(f => { byId(`f-${f}`).value = vessel[f]; });
  openModal('Edit vessel', `Updating ${vessel.vessel_id} details.`, '✏️');
}

/* ---- Delete flow ---- */
function openDelete(id, name) {
  pendingDeleteId = id;
  byId('delete-name').textContent = name;
  deleteOverlay.hidden = false;
  requestAnimationFrame(() => deleteOverlay.classList.add('open'));
}
function closeDelete() {
  deleteOverlay.classList.remove('open');
  setTimeout(() => { deleteOverlay.hidden = true; pendingDeleteId = null; }, 200);
}
byId('delete-cancel').addEventListener('click', closeDelete);
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) closeDelete(); });
byId('delete-confirm').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    const res = await fetch(`${API}/${pendingDeleteId}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`);
    toast('Vessel removed from fleet');
    closeDelete();
    loadVessels();
  } catch (err) {
    toast(err.message, 'error');
    closeDelete();
  }
});

/* ---- Save (create or update) ---- */
form.addEventListener('submit', async e => {
  e.preventDefault();
  const dbId = byId('form-db-id').value;
  const payload = {};
  FIELDS.forEach(f => {
    const val = byId(`f-${f}`).value.trim();
    payload[f] = INT_FIELDS.has(f) ? Number(val) : val;
  });
  const saveBtn = byId('save-btn');
  const saveLabel = byId('save-label');
  const spinner = byId('save-spinner');
  saveBtn.disabled = true;
  saveLabel.textContent = 'Saving…';
  spinner.hidden = false;
  try {
    const isEdit = !!dbId;
    const res = await fetch(isEdit ? `${API}/${dbId}` : API, {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Error ${res.status}`);
    }
    toast(isEdit ? `${payload.vessel_id} updated successfully` : `${payload.vessel_id} added to fleet`);
    closeModal();
    loadVessels();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveLabel.textContent = 'Save vessel';
    spinner.hidden = true;
  }
});

/* ---- Keyboard shortcuts ---- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeDelete(); }
});

/* ---- Auth Status Badge ---- */
function renderUserBadge() {
  const container = document.getElementById('topbar-user');
  if (!container) return;
  const rawUser = localStorage.getItem('hl_user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  if (user) {
    container.innerHTML = `
      <div class="user-pill" title="${user.email}">
        <span class="user-pill-icon">👤</span>
        <span>${user.full_name}</span>
      </div>
      <button type="button" class="btn-logout" id="btn-logout" title="Sign out">Sign out</button>
    `;
    document.getElementById('btn-logout').addEventListener('click', () => {
      localStorage.removeItem('hl_token');
      localStorage.removeItem('hl_user');
      window.location.href = 'index.html';
    });
  } else {
    container.innerHTML = `<a href="login.html" class="btn-login-nav">Sign in</a>`;
  }
}

/* ---- Init ---- */
renderUserBadge();
loadVessels();
