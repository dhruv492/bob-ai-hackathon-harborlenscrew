const baseVessels = [
  { id: 'MV-Aster', eta: '06:00', berth: 'B-03', cargo: 'Reefer containers', priority: 'Cold chain', dwell: 18, cranes: 3, utilization: 88 },
  { id: 'MV-Northstar', eta: '09:00', berth: 'B-01', cargo: 'Auto components', priority: 'Connection-sensitive', dwell: 12, cranes: 2, utilization: 76 },
  { id: 'MV-Kestrel', eta: '13:00', berth: 'B-02', cargo: 'Mixed retail', priority: 'Standard', dwell: 7, cranes: 2, utilization: 69 },
  { id: 'MV-Solace', eta: '18:00', berth: 'B-04', cargo: 'Project cargo', priority: 'High value', dwell: 10, cranes: 1, utilization: 82 },
  { id: 'MV-Atlas', eta: 'Day 2 · 04:00', berth: 'B-01', cargo: 'Dry bulk', priority: 'Standard', dwell: 5, cranes: 2, utilization: 61 }
];
let scenario = { weather: 1, capacity: 0, arrival: 0 };
const demoMode = new URLSearchParams(window.location.search).get('demo');
if (demoMode === 'stress' || demoMode === 'brief') scenario = { weather: 2, capacity: 1, arrival: 6 };
const weatherNames = ['Clear', 'Moderate', 'Severe'];
const byId = id => document.getElementById(id);

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
  const unavailable = state.capacity ? ['B-04', 'B-02'].slice(0, state.capacity) : [];
  return [...vessels].sort((a,b) => b.score - a.score).map((vessel, index) => {
    const berth = unavailable.includes(vessel.berth) ? (vessel.berth === 'B-04' ? 'B-03' : 'B-01') : vessel.berth;
    const attention = berth !== vessel.berth || vessel.score >= 70;
    return { ...vessel, assignedBerth: berth, start: index === 0 ? `Today · ${vessel.eta}` : index < 3 ? `Today · +${index * 4 + scenario.arrival}h` : `Day ${index - 1} · 04:00`, attention };
  });
}

function render() {
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
  byId('plan-note').textContent = scenario.capacity ? 'Capacity loss reroutes compatible vessels' : 'Compatible berth first, urgency second';
  return { vessels, plan };
}

function syncControls() {
  byId('weather').value = scenario.weather; byId('capacity').value = scenario.capacity; byId('arrival').value = scenario.arrival;
  byId('weather-value').value = weatherNames[scenario.weather]; byId('capacity-value').value = scenario.capacity; byId('arrival-value').value = `${scenario.arrival} hours`;
}
function generateBrief() {
  const { vessels, plan } = render(); const top = vessels.sort((a,b)=>b.score-a.score).slice(0,3); const action = plan.filter(p=>p.attention);
  byId('brief-panel').hidden = false;
  byId('brief-content').innerHTML = `<div class="brief-grid"><div><h3>BLUF</h3><p>Protect the next berth window for <strong>${top[0].id}</strong> (risk ${top[0].score}) and stage ${top[1].id} next. ${scenario.weather === 2 ? 'Severe weather is amplifying schedule pressure; confirm marine-side restrictions before release.' : 'The plan remains feasible, but utilization leaves limited recovery buffer.'}</p><h3>Priority actions</h3><ul>${action.slice(0,3).map(v=>`<li>Supervisor review: ${v.id} at ${v.assignedBerth}; ${v.drivers.join(', ')}.</li>`).join('') || '<li>Maintain the baseline sequence and monitor ETA variance.</li>'}</ul></div><div><h3>Bob investigation context</h3><p>Use <code>src/bob-skills/port-operations.md</code> with the app and source to validate this brief. The structured inputs are bounded to the current scenario and deterministic plan.</p><h3>Assumptions and checks</h3><ul><li>Data is synthetic and requires feed validation.</li><li>Berth assignments remain subject to supervisor approval.</li><li>Confirm crane labor and marine restrictions before execution.</li></ul></div></div>`;
  byId('brief-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
['weather','capacity','arrival'].forEach(id => byId(id).addEventListener('input', event => { scenario[id] = Number(event.target.value); syncControls(); }));
byId('apply-button').addEventListener('click', () => { render(); byId('brief-panel').hidden = true; });
byId('reset-button').addEventListener('click', () => { scenario = { weather: 1, capacity: 0, arrival: 0 }; syncControls(); render(); byId('brief-panel').hidden = true; });
byId('brief-button').addEventListener('click', generateBrief);
byId('clock').textContent = new Intl.DateTimeFormat('en', { weekday:'short', hour:'2-digit', minute:'2-digit' }).format(new Date());
syncControls(); render();
if (demoMode === 'brief') generateBrief();
