/* ===== CONFIG ===== */
const LINE_CFG = {
  BOGOR:         {name:'Bogor',         color:'#c62828'},
  TANGERANG:     {name:'Tangerang',     color:'#6d4c1f'},
  RANGKASBITUNG: {name:'Rangkasbitung', color:'#256329'},
  PRIOK:         {name:'Priok',         color:'#ad1457'},
  CIKARANG:      {name:'Cikarang',      color:'#1455a8'},
};

/* ===== STATE ===== */
let curStation = null;
let curDir     = 'ALL';
let nowMin = 0, nowSec = 0;

/* ===== UTILS ===== */
const pad = n => String(n).padStart(2,'0');

function getWIB(){
  const n = new Date();
  return new Date(n.getTime() + n.getTimezoneOffset()*60000 + 7*3600000);
}

function toStr(m){
  return m == null ? '--:--' : `${pad(Math.floor(m/60)%24)}:${pad(m%60)}`;
}

function lineOf(t){ return LINE_MAP[t.l] || t.l; }

function cdStr(arrMin){
  const totalSec = (arrMin - nowMin)*60 - nowSec;
  if(totalSec <= 0) return 'Tiba';
  const m = Math.floor(totalSec/60), s = totalSec % 60;
  if(m >= 60) return `${Math.floor(m/60)}j ${m%60}m`;
  return `${pad(m)}:${pad(s)}`;
}

function cdCls(arrMin){
  const d = arrMin - nowMin;
  if(d <= 0) return 'now';
  if(d <= 5)  return 'soon';
  return '';
}

/* ===== CLOCK ===== */
function updateClock(){
  const d = getWIB();
  nowMin = d.getHours()*60 + d.getMinutes();
  nowSec = d.getSeconds();
  document.getElementById('clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ===== GET UPCOMING FOR STATION ===== */
function getUpcoming(limit=20){
  const idx = STATIONS.indexOf(curStation);
  if(idx < 0) return [];
  const res = [], end = nowMin + 240;
  for(const t of SCHEDULE){
    const am = t.s[idx];
    if(am === undefined || am < nowMin || am > end) continue;
    const dest = t.r.split(' - ').pop()?.trim() || '';
    if(curDir !== 'ALL' && dest !== curDir) continue;
    res.push({ arrival:am, dest:dest.toUpperCase(), ka:t.k, line:lineOf(t) });
  }
  res.sort((a,b) => a.arrival - b.arrival);
  return res.slice(0, limit);
}

/* ===== RENDER ===== */
function render(){
  const heroSec  = document.getElementById('heroSection');
  const listSec  = document.getElementById('listSection');
  const empty    = document.getElementById('emptyState');
  const noTr     = document.getElementById('noTrains');

  // No station selected
  if(!curStation){
    heroSec.style.display = 'none';
    listSec.style.display = 'none';
    noTr.style.display    = 'none';
    empty.style.display   = 'block';
    return;
  }

  empty.style.display = 'none';
  const trains = getUpcoming();

  if(!trains.length){
    heroSec.style.display = 'none';
    listSec.style.display = 'none';
    noTr.style.display    = 'block';
    return;
  }
  noTr.style.display = 'none';

  // === HERO ===
  const f   = trains[0];
  const cfg = LINE_CFG[f.line] || {name:f.line, color:'#1b8c3e'};
  const hc  = document.getElementById('heroCard');
  hc.className = `hero-card hbg-${f.line}`;

  document.getElementById('heroTime').textContent = toStr(f.arrival);
  document.getElementById('heroBadge').textContent = cfg.name;
  document.getElementById('heroDest').textContent  = `→ ${f.dest}`;

  const hcd = document.getElementById('heroCD');
  hcd.textContent      = cdStr(f.arrival);
  hcd.dataset.arrival  = f.arrival;

  heroSec.style.display = 'block';

  // === LIST (rest) ===
  const rest = trains.slice(1);
  if(rest.length){
    listSec.style.display = 'block';
    document.getElementById('trainList').innerHTML = rest.map(tr => {
      const c  = LINE_CFG[tr.line] || {color:'#888'};
      const cd = cdStr(tr.arrival);
      const cl = cdCls(tr.arrival);
      return `<div class="train-item bl-${tr.line}" style="border-left-color:${c.color}">
        <span class="ti-time">${toStr(tr.arrival)}</span>
        <div class="ti-body">
          <div class="ti-dest">→ ${tr.dest}</div>
          <div class="ti-sub">${c.name||tr.line} · ${tr.ka}</div>
        </div>
        <span class="ti-cd ${cl}" data-arrival="${tr.arrival}">${cd}</span>
      </div>`;
    }).join('');
  } else {
    listSec.style.display = 'none';
  }
}

/* ===== DIRECTION TABS ===== */
function buildDirTabs(){
  const idx = STATIONS.indexOf(curStation);
  const destSet = new Set();
  SCHEDULE.forEach(t => {
    if(t.s[idx] === undefined) return;
    const d = t.r.split(' - ').pop()?.trim();
    if(d) destSet.add(d);
  });

  const dests = [...destSet].sort();
  document.getElementById('dirBtns').innerHTML = dests.map(d =>
    `<button class="fpill" data-dir="${d}" onclick="setDir(this,'${d.replace(/'/g,"\\'")}')">→ ${d}</button>`
  ).join('');

  // Reset active
  document.querySelectorAll('#dirRow .fpill').forEach(b => b.classList.remove('active'));
  document.querySelector('#dirRow .fpill[data-dir="ALL"]').classList.add('active');
  document.getElementById('dirRow').style.display = 'flex';
}

function setDir(btn, dir){
  curDir = dir;
  document.querySelectorAll('#dirRow .fpill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

/* ===== SELECT STATION ===== */
function selectStation(name){
  curStation = name;
  curDir = 'ALL';

  // Update card UI
  document.getElementById('scName').textContent = name;
  const idx  = STATIONS.indexOf(name);
  const lines = [...new Set(SCHEDULE.filter(t => t.s[idx] !== undefined).map(lineOf))];
  document.getElementById('scDot').style.background = LINE_CFG[lines[0]]?.color || 'var(--accent)';

  // Close search FIRST, then build tabs + render
  closeSearch();
  buildDirTabs();
  render();
}

/* ===== SEARCH ===== */
function openSearch(){
  document.getElementById('searchOverlay').classList.add('open');
  document.getElementById('searchInput').value = '';
  renderSearch('');
  // slight delay so overlay is visible before focusing (avoids iOS keyboard jump)
  setTimeout(() => document.getElementById('searchInput').focus(), 80);
}

function closeSearch(){
  document.getElementById('searchOverlay').classList.remove('open');
  document.getElementById('searchInput').blur();
  document.getElementById('searchInput').value = '';
}

// Tap outside modal closes it
function handleOverlayClick(e){
  if(e.target === document.getElementById('searchOverlay')) closeSearch();
}

document.getElementById('searchInput').addEventListener('input', e => {
  renderSearch(e.target.value.trim());
});

function renderSearch(q){
  const el    = document.getElementById('searchList');
  const lower = q.toLowerCase();
  const list  = q
    ? STATIONS.filter(s => s.toLowerCase().includes(lower)).slice(0,25)
    : STATIONS.slice(0,35);

  el.innerHTML = list.map(s => {
    const idx   = STATIONS.indexOf(s);
    const lines = [...new Set(SCHEDULE.filter(t => t.s[idx] !== undefined).map(lineOf))];
    const col   = LINE_CFG[lines[0]]?.color || '#888';
    const lStr  = lines.map(l => LINE_CFG[l]?.name || l).join(', ');
    return `<li class="search-item" onclick="selectStation('${s.replace(/'/g,"\\'")}')">
      <span class="si-dot" style="background:${col}"></span>
      <span class="si-name">${s}</span>
      <span class="si-lines">${lStr}</span>
    </li>`;
  }).join('');
}

/* ===== TICK ===== */
function tickSecond(){
  updateClock();
  // In-place countdown update — no full re-render
  document.querySelectorAll('[data-arrival]').forEach(el => {
    const arr = parseInt(el.dataset.arrival);
    if(isNaN(arr)) return;
    const cd  = cdStr(arr);
    const cls = cdCls(arr);
    el.textContent = cd;
    if(el.classList.contains('ti-cd') || el.id === 'heroCD'){
      const base = el.id === 'heroCD' ? 'hero-cd' : 'ti-cd';
      el.className = cls ? `${base} ${cls}` : base;
      el.dataset.arrival = arr; // keep
    }
  });
}

function fullRefresh(){
  updateClock();
  if(curStation) render();
}

// Init
updateClock();
render();
setInterval(tickSecond, 1000);
setInterval(fullRefresh, 30000);
