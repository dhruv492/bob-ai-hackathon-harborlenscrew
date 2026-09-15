/* ---- fetch vessels from API instead of hardcoded array ---- */
let baseVessels = [];
let scenario = { weather: 1, capacity: 0, arrival: 0 };
let lastPlan = [];   // saved before each scenario apply for diff
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

/* ---- SVG ring gauge for risk score ---- */
function riskRing(score) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const fill = circ - (score / 99) * circ;
  const isCritical = score >= 70;
  const isWatch = score >= 40 && score < 70;
  const color = isCritical ? '#da1e28' : isWatch ? '#f1c21b' : '#198038';
  const textColor = isCritical ? '#da1e28' : isWatch ? '#8a6500' : '#0e6027';
  const bgColor = isCritical ? '#fff1f1' : isWatch ? '#fdf9ea' : '#e8f5ed';
  return `<div class="risk-ring-wrap" style="background:${bgColor}" title="Risk score: ${score}">
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r="${r}" fill="none" stroke="#e0e0e0" stroke-width="4"/>
      <circle cx="28" cy="28" r="${r}" fill="none" stroke="${color}" stroke-width="4"
        stroke-dasharray="${circ}" stroke-dashoffset="${fill}"
        stroke-linecap="round" transform="rotate(-90 28 28)"
        style="transition:stroke-dashoffset .6s ease"/>
    </svg>
    <span class="risk-ring-score" style="color:${textColor}">${score}</span>
  </div>`;
}

/* ---- Mini bar chart for utilization ---- */
function utilizationBar(pct) {
  const color = pct >= 80 ? '#da1e28' : pct >= 60 ? '#f1c21b' : '#198038';
  return `<div class="util-inline">
    <div class="util-inline-track"><div class="util-inline-fill" style="width:${pct}%;background:${color}"></div></div>
    <span class="util-inline-val">${pct}%</span>
  </div>`;
}

/* ---- Priority pill ---- */
function priorityPill(p) {
  const cls = p === 'Cold chain' ? 'pill-cold' : p === 'Connection-sensitive' ? 'pill-conn' : p === 'High value' ? 'pill-high' : 'pill-std';
  return `<span class="priority-pill ${cls}">${p}</span>`;
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
  const watch = vessels.filter(v => v.score >= 40 && v.score < 70).length;
  const utilization = Math.min(99, Math.round(vessels.reduce((sum, v) => sum + v.utilization, 0) / vessels.length + scenario.capacity * 5));
  byId('scenario-name').textContent = scenario.capacity || scenario.arrival || scenario.weather !== 1 ? 'Stress-tested' : 'Baseline plan';
  byId('metrics').innerHTML = [
    ['Vessels in horizon', vessels.length, '72-hour operating view', ''],
    ['Critical attention', critical, critical ? 'Act before next tide window' : 'No critical conflicts', critical ? 'metric-critical' : ''],
    ['Berth utilization', `${utilization}%`, utilization > 80 ? 'Above preferred buffer' : 'Within preferred buffer', utilization > 80 ? 'metric-warn' : ''],
    ['Cranes allocated', plan.reduce((sum,v)=>sum+v.cranes,0), 'Across recommended sequence', '']
  ].map(([label, value, note, cls]) => `<article class="metric ${cls}"><span>${label}</span><strong>${value}</strong><em>${note}</em></article>`).join('');

  // Vessel queue with ring gauges
  byId('vessel-list').innerHTML = vessels.sort((a,b)=>b.score-a.score).map(v => {
    const levelClass = v.score >= 70 ? 'vessel critical-vessel' : v.score >= 40 ? 'vessel watch-vessel' : 'vessel';
    const levelLabel = v.score >= 70 ? '<span class="level-badge level-critical">● Critical</span>' : v.score >= 40 ? '<span class="level-badge level-watch">● Watch</span>' : '<span class="level-badge level-normal">● Normal</span>';
    return `<article class="${levelClass}">
      ${riskRing(v.score)}
      <div class="vessel-info">
        <div class="vessel-header-row">
          <h3>${v.id}</h3>
          ${levelLabel}
          <span class="subtle vessel-eta">ETA ${v.eta}</span>
        </div>
        <div class="vessel-meta-row">
          ${priorityPill(v.priority)}
          <span class="vessel-cargo">${v.cargo}</span>
          ${utilizationBar(v.utilization)}
        </div>
        <p class="vessel-drivers">↳ ${v.drivers.join(' · ')}</p>
      </div>
      <div class="action ${v.score >= 70 ? 'action-urgent' : ''}">${v.score >= 70 ? '⚠ Protect berth window' : 'Monitor arrival cadence'}</div>
    </article>`;
  }).join('');

  // Plan table with diff highlighting
  byId('plan-body').innerHTML = plan.map(v => {
    const prev = lastPlan.find(p => p.id === v.id);
    const berthChanged = prev && prev.assignedBerth !== v.assignedBerth;
    const scoreChanged = prev && prev.score !== v.score;
    const rowClass = berthChanged ? 'plan-row-changed' : '';
    const berthDiff = berthChanged ? `<span class="berth-diff">${prev.assignedBerth} →</span> ` : '';
    const scoreDiff = scoreChanged ? ` <span class="score-diff ${v.score > prev.score ? 'score-up' : 'score-down'}">${v.score > prev.score ? '▲' : '▼'}${Math.abs(v.score - prev.score)}</span>` : '';
    return `<tr class="${rowClass}">
      <td>${v.start}</td>
      <td>${berthDiff}<strong>${v.assignedBerth}</strong></td>
      <td><strong>${v.id}</strong>${scoreDiff}</td>
      <td>${v.cargo}<br><span class="subtle">${v.priority}</span></td>
      <td>${v.cranes}</td>
      <td><span class="badge ${v.attention ? 'attention' : ''}">${v.attention ? 'Supervisor review' : 'Ready to stage'}</span></td>
    </tr>`;
  }).join('');
  byId('plan-note').textContent = scenario.capacity ? `${scenario.capacity} berth(s) offline — routing priority fleet` : 'Compatible berth first, urgency second';

  // Render mini utilization chart
  renderUtilizationChart(vessels);

  return { vessels, plan };
}

/* ---- Mini SVG bar chart for berth utilization ---- */
function renderUtilizationChart(vessels) {
  const container = byId('util-chart');
  if (!container) return;
  const sorted = [...vessels].sort((a,b) => b.utilization - a.utilization);
  const barW = 38, gap = 10, h = 80, labelH = 22;
  const totalW = sorted.length * (barW + gap) - gap;
  const bars = sorted.map((v, i) => {
    const barH = Math.round((v.utilization / 100) * h);
    const y = h - barH;
    const color = v.utilization >= 80 ? '#da1e28' : v.utilization >= 60 ? '#f1c21b' : '#198038';
    const x = i * (barW + gap);
    const scoreColor = v.score >= 70 ? '#da1e28' : v.score >= 40 ? '#8a6500' : '#198038';
    return `<g>
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${color}" opacity=".85"/>
      <text x="${x + barW/2}" y="${h + 13}" text-anchor="middle" font-size="9" fill="#525252" font-family="IBM Plex Sans,sans-serif">${v.id.replace('MV-','')}</text>
      <text x="${x + barW/2}" y="${y - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="${color}">${v.utilization}%</text>
      <text x="${x + barW/2}" y="${h + 22}" text-anchor="middle" font-size="8" fill="${scoreColor}" font-weight="700">r:${v.score}</text>
    </g>`;
  }).join('');
  // 80% threshold line
  const threshY = Math.round((1 - 0.80) * h);
  container.innerHTML = `<svg width="${totalW}" height="${h + labelH + 4}" viewBox="0 0 ${totalW} ${h + labelH + 4}" style="overflow:visible">
    <line x1="0" y1="${threshY}" x2="${totalW}" y2="${threshY}" stroke="#da1e28" stroke-dasharray="3 3" stroke-width="1" opacity=".5"/>
    <text x="${totalW + 3}" y="${threshY + 3}" font-size="8" fill="#da1e28" font-family="IBM Plex Sans,sans-serif">80%</text>
    ${bars}
  </svg>`;
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

/* ---- Polished Brief Generator ---- */
function generateBrief() {
  const { vessels, plan } = render();
  if (!vessels.length) return;
  const top = [...vessels].sort((a,b)=>b.score-a.score).slice(0,3);
  const action = plan.filter(p=>p.attention);
  const isStress = scenario.weather === 2 || scenario.capacity > 0 || scenario.arrival > 0;
  const weatherLabel = ['clear', 'moderate', 'severe'][scenario.weather];
  const now = new Intl.DateTimeFormat('en', { weekday:'short', hour:'2-digit', minute:'2-digit' }).format(new Date());

  const priorityRows = action.slice(0,4).map((v,i) => `
    <div class="brief-action-row">
      <span class="brief-action-num">${i+1}</span>
      <div>
        <strong>${v.id}</strong> → ${v.assignedBerth}
        <div class="brief-action-sub">${v.drivers.join(' · ')}</div>
      </div>
      <span class="brief-risk-pill ${v.score >= 70 ? 'pill-risk-crit' : 'pill-risk-watch'}">${v.score}</span>
    </div>`).join('') || '<p class="brief-ok">✓ No vessels require immediate supervisor intervention.</p>';

  const riskTableRows = top.map(v => `
    <tr>
      <td><strong>${v.id}</strong></td>
      <td>${riskRingSmall(v.score)}</td>
      <td>${v.cargo}</td>
      <td>${priorityPill(v.priority)}</td>
      <td class="brief-drivers-cell">${v.drivers.join(', ')}</td>
    </tr>`).join('');

  byId('brief-panel').hidden = false;
  byId('brief-content').innerHTML = `
    <div class="brief-header-meta">
      <span class="brief-timestamp">Generated ${now}</span>
      ${isStress ? '<span class="brief-stress-badge">⚠ Stress scenario active</span>' : '<span class="brief-baseline-badge">✓ Baseline plan</span>'}
    </div>

    <div class="brief-grid">
      <div class="brief-col">
        <div class="brief-section">
          <h3 class="brief-section-title">📋 BLUF</h3>
          <p class="brief-bluf-text">
            Protect the next berth window for <strong>${top[0].id}</strong> (risk score <strong>${top[0].score}</strong>)
            and pre-stage <strong>${top[1]?.id || '—'}</strong> next.
            ${scenario.weather === 2
              ? '<strong class="brief-alert">⚠ Severe weather is amplifying schedule pressure.</strong> Confirm marine-side restrictions before any vessel release.'
              : 'The plan remains feasible, but utilization leaves limited recovery buffer.'}
            ${scenario.capacity > 0 ? ` ${scenario.capacity} berth(s) offline — rerouting active.` : ''}
          </p>
        </div>

        <div class="brief-section">
          <h3 class="brief-section-title">🎯 Priority Actions</h3>
          <div class="brief-actions">${priorityRows}</div>
        </div>
      </div>

      <div class="brief-col">
        <div class="brief-section">
          <h3 class="brief-section-title">📊 Top-3 Risk Vessels</h3>
          <table class="brief-risk-table">
            <thead><tr><th>Vessel</th><th>Score</th><th>Cargo</th><th>Priority</th><th>Drivers</th></tr></thead>
            <tbody>${riskTableRows}</tbody>
          </table>
        </div>

        <div class="brief-section">
          <h3 class="brief-section-title">🛡 Assumptions & Checks</h3>
          <ul class="brief-checks">
            <li>Data is synthetic — validate against live terminal feed before execution.</li>
            <li>Weather: <strong>${weatherLabel}</strong> · Berths offline: <strong>${scenario.capacity}</strong> · Arrival variance: <strong>+${scenario.arrival}h</strong></li>
            <li>Berth assignments require supervisor approval before vessel release.</li>
            <li>Confirm crane labor availability and marine pilotage restrictions.</li>
          </ul>
        </div>

        <div class="brief-section brief-bob-box">
          <h3 class="brief-section-title">🤖 IBM Bob Investigation</h3>
          <p>Use <code>src/bob-skills/port-operations.md</code> with this app open. Ask Bob:<br>
          <em>"Review the current HarborLens plan and write a BLUF brief citing only data visible in the app."</em></p>
        </div>
      </div>
    </div>`;

  byId('brief-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---- Small ring for brief table ---- */
function riskRingSmall(score) {
  const r = 12;
  const circ = 2 * Math.PI * r;
  const fill = circ - (score / 99) * circ;
  const color = score >= 70 ? '#da1e28' : score >= 40 ? '#f1c21b' : '#198038';
  return `<span class="ring-small-wrap">
    <svg width="30" height="30" viewBox="0 0 30 30" style="vertical-align:middle">
      <circle cx="15" cy="15" r="${r}" fill="none" stroke="#e0e0e0" stroke-width="3"/>
      <circle cx="15" cy="15" r="${r}" fill="none" stroke="${color}" stroke-width="3"
        stroke-dasharray="${circ}" stroke-dashoffset="${fill}"
        stroke-linecap="round" transform="rotate(-90 15 15)"/>
    </svg>
    <span style="font-size:11px;font-weight:700;color:${color};vertical-align:middle;margin-left:2px">${score}</span>
  </span>`;
}

['weather','capacity','arrival'].forEach(id => byId(id).addEventListener('input', event => {
  scenario[id] = Number(event.target.value);
  syncControls();
}));

byId('apply-button').addEventListener('click', () => {
  // Save current plan for diff before re-rendering
  const prevVessels = baseVessels.map(v => calculateRisk(v, { weather: 1, capacity: 0, arrival: 0 }));
  // Actually save the last rendered plan
  lastPlan = [...(byId('plan-body').__lastPlan || [])];
  // Re-render with diff
  const { plan } = render();
  byId('plan-body').__lastPlan = plan;
  byId('brief-panel').hidden = true;
  // Show diff notice if changes exist
  showDiffNotice(plan);
});

byId('reset-button').addEventListener('click', () => {
  lastPlan = [];
  scenario = { weather: 1, capacity: 0, arrival: 0 };
  syncControls();
  render();
  byId('brief-panel').hidden = true;
  const notice = byId('diff-notice');
  if (notice) notice.remove();
});
byId('brief-button').addEventListener('click', generateBrief);
byId('clock').textContent = new Intl.DateTimeFormat('en', { weekday:'short', hour:'2-digit', minute:'2-digit' }).format(new Date());

/* ---- Before/After diff notice ---- */
function showDiffNotice(currentPlan) {
  const old = byId('plan-body').__lastPlan;
  byId('plan-body').__lastPlan = currentPlan;
  const existing = byId('diff-notice');
  if (existing) existing.remove();

  const changes = currentPlan.filter(v => {
    const prev = (old || []).find(p => p.id === v.id);
    return prev && (prev.assignedBerth !== v.assignedBerth || prev.score !== v.score);
  });
  if (!changes.length) return;

  const notice = document.createElement('div');
  notice.id = 'diff-notice';
  notice.className = 'diff-notice';
  notice.innerHTML = `<strong>Plan updated:</strong> ${changes.length} vessel${changes.length > 1 ? 's' : ''} affected —
    ${changes.map(v => {
      const prev = (old || []).find(p => p.id === v.id);
      const parts = [];
      if (prev && prev.assignedBerth !== v.assignedBerth) parts.push(`${v.id}: ${prev.assignedBerth} → ${v.assignedBerth}`);
      else if (prev && prev.score !== v.score) parts.push(`${v.id} score ${prev.score} → ${v.score}`);
      return parts.join('');
    }).filter(Boolean).join(' · ')}
    <button class="diff-dismiss" onclick="this.parentNode.remove()">✕</button>`;
  const planSection = document.querySelector('.plan-panel');
  if (planSection) planSection.insertAdjacentElement('beforebegin', notice);
}

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

/* ---- Demo Mode Guided Walkthrough ---- */
function startDemoWalkthrough(mode) {
  const steps = mode === 'stress' ? [
    { target: '#metrics', title: 'Step 1 — Operational Picture', text: 'These 4 metrics summarize the current port state. Notice "Critical attention" is elevated due to the active stress scenario.' },
    { target: '#vessel-list', title: 'Step 2 — Risk Queue', text: 'Vessels are ranked by their explainable risk score (0–99). Red rings = critical (≥70). Each card shows the exact drivers behind the score.' },
    { target: '.scenario-panel', title: 'Step 3 — What-If Studio', text: 'Weather is set to Severe, 1 berth is offline, and arrivals are delayed 6h. This is the stress scenario. Adjust sliders and hit "Apply scenario" to see plan updates.' },
    { target: '.plan-panel', title: 'Step 4 — Berth Plan Diff', text: 'After applying a scenario, changed rows are highlighted. Berth re-assignments and score deltas appear inline.' },
  ] : [
    { target: '#brief-panel', title: 'Demo — Shift Brief', text: 'This is the IBM Bob-ready BLUF brief. It cites only data from the current plan — no invented facts. Use the Bob skill to verify it.' },
    { target: '.brief-risk-table', title: 'Top-3 Risk Vessels', text: 'The brief surfaces the three highest-risk vessels with scores, cargo types, and the specific drivers that elevated each score.' },
    { target: '.brief-bob-box', title: 'Bob Integration', text: 'Copy the shown prompt into IBM Bob with the port-operations skill active. Bob will inspect the source and validate this brief.' },
  ];

  let step = 0;
  const overlay = document.createElement('div');
  overlay.id = 'demo-walkthrough';
  overlay.className = 'demo-overlay';
  document.body.appendChild(overlay);

  function renderStep() {
    const s = steps[step];
    const target = document.querySelector(s.target);
    overlay.innerHTML = '';

    if (target) {
      const rect = target.getBoundingClientRect();
      const scrollY = window.scrollY;
      // Highlight box
      const hl = document.createElement('div');
      hl.className = 'demo-highlight';
      hl.style.cssText = `top:${rect.top + scrollY - 6}px;left:${rect.left - 6}px;width:${rect.width + 12}px;height:${rect.height + 12}px`;
      overlay.appendChild(hl);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'demo-tooltip';
    tooltip.innerHTML = `
      <div class="demo-tooltip-header">
        <span class="demo-step-counter">Step ${step+1}/${steps.length}</span>
        <button class="demo-close" id="demo-close-btn">✕ Exit demo</button>
      </div>
      <h4>${s.title}</h4>
      <p>${s.text}</p>
      <div class="demo-tooltip-footer">
        <button class="secondary demo-nav-btn" id="demo-prev" ${step === 0 ? 'disabled' : ''}>← Prev</button>
        <div class="demo-dots">${steps.map((_,i) => `<span class="demo-dot ${i === step ? 'active' : ''}"></span>`).join('')}</div>
        <button class="primary demo-nav-btn" id="demo-next">${step === steps.length - 1 ? 'Finish ✓' : 'Next →'}</button>
      </div>`;
    overlay.appendChild(tooltip);

    document.getElementById('demo-next').addEventListener('click', () => { if (step < steps.length - 1) { step++; renderStep(); } else { overlay.remove(); } });
    document.getElementById('demo-prev').addEventListener('click', () => { if (step > 0) { step--; renderStep(); } });
    document.getElementById('demo-close-btn').addEventListener('click', () => overlay.remove());
  }

  setTimeout(renderStep, 600);
}

/* ---- init: fetch from API then render ---- */
(async () => {
  renderUserBadge();
  await fetchVessels();
  syncControls();
  const { plan } = render();
  byId('plan-body').__lastPlan = plan;
  if (demoMode === 'brief') { generateBrief(); setTimeout(() => startDemoWalkthrough('brief'), 800); }
  if (demoMode === 'stress') setTimeout(() => startDemoWalkthrough('stress'), 800);

  // Personalized experience — welcome-back banner for all logged-in users
  const rawUser = localStorage.getItem('hl_user');
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      showWelcomeBack(user);
    } catch(e) { /* ignore parse error */ }
  }
})();
