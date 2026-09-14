/* ---- fetch vessels from API instead of hardcoded array ---- */
let baseVessels = [];
let scenario = { weather: 1, capacity: 0, arrival: 0 };
const demoMode = new URLSearchParams(window.location.search).get('demo');
if (demoMode === 'stress' || demoMode === 'brief') scenario = { weather: 2, capacity: 1, arrival: 6 };
const weatherNames = ['Clear', 'Moderate', 'Severe'];
const byId = id => document.getElementById(id);

function authHeaders(extra = {}) {
  const token = localStorage.getItem('hl_token');
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

function userStorageKey(suffix) {
  try {
    const u = JSON.parse(localStorage.getItem('hl_user') || 'null');
    return u?.id != null ? `hl_${suffix}_${u.id}` : `hl_${suffix}`;
  } catch {
    return `hl_${suffix}`;
  }
}

async function fetchVessels() {
  try {
    const res = await fetch('/api/vessels', { headers: authHeaders() });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    baseVessels = data.map(v => ({
      id: v.vessel_id,
      eta: v.eta,
      berth: v.berth,
      cargo: v.cargo,
      priority: v.priority,
      dwell: v.dwell,
      cranes: v.cranes,
      utilization: v.utilization,
    }));
  } catch (err) {
    console.error('Failed to fetch vessels, using empty set:', err);
    baseVessels = [];
  }
}

function calculateRisk(vessel, state) {
  const urgency = vessel.priority === 'Cold chain' ? 25 : vessel.priority === 'Connection-sensitive' ? 18 : vessel.priority === 'High value' ? 12 : 5;
  const weather = state.weather * 9;
  const capacity = state.capacity * (vessel.berth === 'B-01' || vessel.berth === 'B-03' ? 11 : 6);
  const score = Math.min(99, Math.round(vessel.utilization * .38 + vessel.dwell * .7 + urgency + weather + capacity + state.arrival * .55));
  const drivers = [];
  if (vessel.utilization >= 80) drivers.push(`${vessel.utilization}% berth utilization`);
  if (vessel.priority !== 'Standard') drivers.push(vessel.priority.toLowerCase());
  if (state.weather === 2) drivers.push('severe weather');
  if (state.capacity > 0) drivers.push(`${state.capacity} berth unavailable`);
  if (state.arrival > 0) drivers.push(`${state.arrival}h arrival shift`);
  return { ...vessel, score, drivers: drivers.length ? drivers : ['normal operating load'] };
}

function createPlan(vessels, state) {
  const orderOfLoss = ['B-04', 'B-02', 'B-03', 'B-01'];
  const unavailable = orderOfLoss.slice(0, state.capacity || 0);
  const operational = ['B-01', 'B-02', 'B-03', 'B-04'].filter(b => !unavailable.includes(b));

  return [...vessels].sort((a,b) => b.score - a.score).map((vessel, index) => {
    let berth = vessel.berth;
    if (unavailable.includes(berth)) {
      if (operational.length > 0) {
        berth = operational.includes('B-03') && vessel.berth === 'B-04' ? 'B-03' :
                operational.includes('B-01') && vessel.berth === 'B-02' ? 'B-01' :
                operational[index % operational.length];
      } else {
        berth = 'Anchorage (Hold)';
      }
    }
    const attention = berth !== vessel.berth || vessel.score >= 70 || berth.startsWith('Anchorage');
    return {
      ...vessel,
      assignedBerth: berth,
      start: index === 0 ? `Today · ${vessel.eta}` : index < 3 ? `Today · +${index * 4 + (scenario.arrival || 0)}h` : `Day ${index - 1} · 04:00`,
      attention
    };
  });
}

function render() {
  if (baseVessels.length === 0) {
    byId('metrics').innerHTML = '<article class="metric"><span>No vessels</span><strong>0</strong><em>Add vessels via the admin panel</em></article>';
    byId('vessel-list').innerHTML = '<p class="subtle" style="padding:20px">No vessel data available. <a href="admin.html">Add vessels →</a></p>';
    byId('plan-body').innerHTML = '';
    return { vessels: [], plan: [] };
  }
  const vessels = baseVessels.map(v => calculateRisk(v, scenario));
  const plan = createPlan(vessels, scenario);
  const critical = vessels.filter(v => v.score >= 70).length;
  const utilization = Math.min(99, Math.round(vessels.reduce((sum, v) => sum + v.utilization, 0) / vessels.length + scenario.capacity * 5));
  byId('scenario-name').textContent = scenario.capacity || scenario.arrival || scenario.weather !== 1 ? 'Stress-tested' : 'Baseline plan';
  byId('metrics').innerHTML = [
    ['Vessels in horizon', vessels.length, '72-hour operating view'],
    ['Critical attention', critical, critical ? 'Act before next tide window' : 'No critical conflicts'],
    ['Berth utilization', `${utilization}%`, utilization > 80 ? 'Above preferred buffer' : 'Within preferred buffer'],
    ['Cranes allocated', plan.reduce((sum,v)=>sum+v.cranes,0), 'Across recommended sequence']
  ].map(([label, value, note]) => `<article class="metric"><span>${label}</span><strong>${value}</strong><em>${note}</em></article>`).join('');
  byId('vessel-list').innerHTML = vessels.sort((a,b)=>b.score-a.score).map(v => `<article class="vessel"><div class="score ${v.score < 70 ? 'watch' : ''}">${v.score}</div><div><h3>${v.id} <span class="subtle">· ETA ${v.eta}</span></h3><p>${v.cargo} · Drivers: ${v.drivers.join(', ')}</p></div><div class="action">${v.score >= 70 ? 'Protect berth window' : 'Monitor arrival cadence'}</div></article>`).join('');
  byId('plan-body').innerHTML = plan.map(v => `<tr><td>${v.start}</td><td>${v.assignedBerth}</td><td><strong>${v.id}</strong></td><td>${v.cargo}<br><span class="subtle">${v.priority}</span></td><td>${v.cranes}</td><td><span class="badge ${v.attention ? 'attention' : ''}">${v.attention ? 'Supervisor review' : 'Ready to stage'}</span></td></tr>`).join('');
  byId('plan-note').textContent = scenario.capacity ? `${scenario.capacity} berth(s) offline — routing priority fleet` : 'Compatible berth first, urgency second';
  return { vessels, plan };
}

function updateImpactPreview() {
  const isBaseline = scenario.weather === 1 && scenario.capacity === 0 && scenario.arrival === 0;
  const impactEl = byId('impact-text');
  const cardEl = byId('sim-impact-card');
  const statusChip = byId('sim-status');
  if (!impactEl) return;

  if (isBaseline) {
    impactEl.textContent = 'Baseline plan — all berths operational, standard buffer available.';
    if (cardEl) cardEl.className = 'sim-impact-card';
    if (statusChip) {
      statusChip.textContent = 'Baseline';
      statusChip.className = 'status-chip';
    }
  } else {
    const impacts = [];
    if (scenario.weather === 2) impacts.push('+18 weather load');
    else if (scenario.weather === 0) impacts.push('-9 weather relief');
    if (scenario.capacity > 0) impacts.push(`${scenario.capacity} berth offline`);
    if (scenario.arrival > 0) impacts.push(`+${scenario.arrival}h arrival variance`);

    const severity = (scenario.weather === 2 ? 2 : 0) + scenario.capacity * 2 + (scenario.arrival >= 6 ? 2 : scenario.arrival > 0 ? 1 : 0);
    const severityLabel = severity >= 5 ? 'Critical port congestion' : severity >= 2 ? 'Moderate schedule pressure' : 'Mild operational variance';
    impactEl.innerHTML = `<strong>${severityLabel}:</strong> ${impacts.join(' · ')}. Click "Apply scenario" to re-sequence berths.`;
    if (cardEl) cardEl.className = `sim-impact-card ${severity >= 5 ? 'impact-severe' : 'impact-warning'}`;
    if (statusChip) {
      statusChip.textContent = 'Stress active';
      statusChip.className = 'status-chip status-active';
    }
  }
}

function syncControls() {
  byId('weather').value = scenario.weather;
  byId('capacity').value = scenario.capacity;
  byId('arrival').value = scenario.arrival;

  // Weather badge
  const wBadgeClass = ['sim-badge-green', 'sim-badge-amber', 'sim-badge-red'];
  const wEl = byId('weather-value');
  wEl.textContent = weatherNames[scenario.weather];
  wEl.className = `sim-badge ${wBadgeClass[scenario.weather]}`;

  // Capacity badge & berth chips (0-4)
  const cap = scenario.capacity || 0;
  const cBadgeClass = cap === 0 ? 'sim-badge-green' : cap <= 2 ? 'sim-badge-amber' : 'sim-badge-red';
  const cLabels = [
    '0 lost (All operational)',
    '1 lost (B-04 offline)',
    '2 lost (B-04, B-02 offline)',
    '3 lost (Only B-01 active)',
    '4 lost (All berths closed)'
  ];
  const cEl = byId('capacity-value');
  cEl.textContent = cLabels[cap] || `${cap} lost`;
  cEl.className = `sim-badge ${cBadgeClass}`;

  const orderOfLoss = ['B-04', 'B-02', 'B-03', 'B-01'];
  const unavailable = orderOfLoss.slice(0, cap);
  ['B-01', 'B-02', 'B-03', 'B-04'].forEach(b => {
    const chip = byId(`chip-${b}`);
    if (chip) {
      const isLost = unavailable.includes(b);
      chip.className = `berth-chip ${isLost ? 'lost' : 'active'}`;
      chip.textContent = `${b} ${isLost ? '✕' : '✓'}`;
    }
  });

  // Arrival badge (1h increment)
  const arr = scenario.arrival || 0;
  const aEl = byId('arrival-value');
  aEl.textContent = arr === 0 ? 'On-time (0h)' : arr === 1 ? '+1 hour delay' : `+${arr} hours delay`;
  aEl.className = `sim-badge ${arr === 0 ? 'sim-badge-green' : arr <= 3 ? 'sim-badge-amber' : 'sim-badge-red'}`;

  updateImpactPreview();
}

function generateBrief() {
  const { vessels, plan } = render(); if (!vessels.length) return; const top = vessels.sort((a,b)=>b.score-a.score).slice(0,3); const action = plan.filter(p=>p.attention);
  byId('brief-panel').hidden = false;
  byId('brief-content').innerHTML = `<div class="brief-grid"><div><h3>BLUF</h3><p>Protect the next berth window for <strong>${top[0].id}</strong> (risk ${top[0].score}) and stage ${top[1].id} next. ${scenario.weather === 2 ? 'Severe weather is amplifying schedule pressure; confirm marine-side restrictions before release.' : 'The plan remains feasible, but utilization leaves limited recovery buffer.'}</p><h3>Priority actions</h3><ul>${action.slice(0,3).map(v=>`<li>Supervisor review: ${v.id} at ${v.assignedBerth}; ${v.drivers.join(', ')}.</li>`).join('') || '<li>Maintain the baseline sequence and monitor ETA variance.</li>'}</ul></div><div><h3>Bob investigation context</h3><p>Use <code>src/bob-skills/port-operations.md</code> with the app and source to validate this brief. The structured inputs are bounded to the current scenario and deterministic plan.</p><h3>Assumptions and checks</h3><ul><li>Data is synthetic and requires feed validation.</li><li>Berth assignments remain subject to supervisor approval.</li><li>Confirm crane labor and marine restrictions before execution.</li></ul></div></div>`;
  byId('brief-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

['weather','capacity','arrival'].forEach(id => byId(id).addEventListener('input', event => {
  scenario[id] = Number(event.target.value);
  syncControls();
}));

byId('apply-button').addEventListener('click', () => { render(); byId('brief-panel').hidden = true; });
byId('reset-button').addEventListener('click', () => { scenario = { weather: 1, capacity: 0, arrival: 0 }; syncControls(); render(); byId('brief-panel').hidden = true; });
byId('brief-button').addEventListener('click', generateBrief);
byId('clock').textContent = new Intl.DateTimeFormat('en', { weekday:'short', hour:'2-digit', minute:'2-digit' }).format(new Date());

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

/* ---- Personalized Dashboard Experience ---- */
function showOnboarding(user) {
  const overlay = byId('onboarding-overlay');
  if (!overlay) return;
  const nameEl = byId('onboard-name');
  if (nameEl) nameEl.textContent = user.full_name.split(' ')[0];
  overlay.hidden = false;

  let current = 0;
  const slides = overlay.querySelectorAll('.onboarding-slide');
  const dots = overlay.querySelectorAll('.onboarding-step-dot');
  const nextBtn = byId('onboard-next');
  const skipBtn = byId('onboard-skip');

  function goTo(idx) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[idx].classList.add('active');
    dots[idx].classList.add('active');
    current = idx;
    nextBtn.textContent = idx === slides.length - 1 ? 'Go to Dashboard →' : 'Next →';
  }

  function dismiss() {
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.hidden = true; overlay.remove(); }, 350);
    localStorage.removeItem('hl_is_new_user');
    localStorage.setItem(userStorageKey('last_active'), new Date().toISOString());
  }

  nextBtn.addEventListener('click', () => {
    if (current < slides.length - 1) goTo(current + 1);
    else dismiss();
  });
  skipBtn.addEventListener('click', dismiss);
  dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.step)));
}

function showWelcomeBack(user) {
  const banner = byId('welcome-back-banner');
  if (!banner) return;
  const nameEl = byId('wb-user-name');
  if (nameEl) nameEl.textContent = user.full_name.split(' ')[0];

  const countEl = byId('wb-login-count');
  const count = localStorage.getItem(userStorageKey('login_count')) || '1';
  if (countEl) countEl.textContent = `#${count}`;

  const timeEl = byId('wb-last-time');
  const lastActive = localStorage.getItem(userStorageKey('last_active'));
  if (timeEl && lastActive) {
    const d = new Date(lastActive);
    const now = new Date();
    const diffH = Math.round((now - d) / 3600000);
    timeEl.textContent = diffH < 1 ? 'just now' : diffH < 24 ? `${diffH}h ago` : `${Math.round(diffH/24)}d ago`;
  } else if (timeEl) {
    timeEl.textContent = 'just now';
  }

  banner.hidden = false;
  localStorage.setItem(userStorageKey('last_active'), new Date().toISOString());

  byId('wb-dismiss').addEventListener('click', () => {
    banner.style.opacity = '0';
    setTimeout(() => { banner.hidden = true; }, 300);
  });
  // Auto-dismiss after 8s
  setTimeout(() => {
    if (!banner.hidden) {
      banner.style.opacity = '0';
      setTimeout(() => { banner.hidden = true; }, 300);
    }
  }, 8000);
}

/* ---- init: fetch from API then render ---- */
(async () => {
  renderUserBadge();
  await fetchVessels();
  syncControls();
  render();
  if (demoMode === 'brief') generateBrief();

  // Personalized experience
  const rawUser = localStorage.getItem('hl_user');
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      const isNew = localStorage.getItem(`hl_is_new_user_${user.id}`) === 'true'
        || localStorage.getItem('hl_is_new_user') === 'true';
      if (isNew) {
        localStorage.removeItem(`hl_is_new_user_${user.id}`);
        showOnboarding(user);
      } else {
        showWelcomeBack(user);
      }
    } catch(e) { /* ignore parse error */ }
  }
})();
