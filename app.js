/* ===== LINE CONFIG ===== */
const LINE_CFG = {
  BOGOR:         {name:'Bogor',         color:'#c62828'},
  TANGERANG:     {name:'Tangerang',     color:'#6d4c1f'},
  RANGKASBITUNG: {name:'Rangkasbitung', color:'#256329'},
  PRIOK:         {name:'Priok',         color:'#ad1457'},
  CIKARANG:      {name:'Cikarang',      color:'#1455a8'},
  NAMBO:         {name:'Nambo',         color:'#607d8b'},
};

/* Data line untuk tab Rute */
const LINES_DATA = [
  {
    key:'BOGOR',
    name:'Bogor Line',
    route:'Jakarta Kota \u2014 Bogor',
    stations:['Jakarta Kota','Jayakarta','Mangga Besar','Sawah Besar','Juanda','Gambir',
      'Gondangdia','Cikini','Manggarai','Tebet','Cawang','Duren Kalibata',
      'Pasar Minggu Baru','Pasar Minggu','Tanjung Barat','Lenteng Agung',
      'Universitas Pancasila','Universitas Indonesia','Pondok Cina','Depok Baru',
      'Depok','Citayam','Bojong Gede','Cilebut','Bogor']
  },
  {
    key:'NAMBO',
    name:'Nambo Branch',
    route:'Citayam \u2014 Nambo',
    stations:['Citayam','Pondok Jati','Nambo']
  },
  {
    key:'CIKARANG',
    name:'Cikarang Loop',
    route:'Cikarang \u21ba Manggarai',
    stations:['Cikarang','Telagamurni','Cibitung','Tambun','Bekasi Timur','Bekasi',
      'Kranji','Cakung','Klender Baru','Buaran','Klender','Jatinegara',
      'Pondok Jati','Kramat','Gang Sentiong','Pasar Senen','Kemayoran',
      'Rajawali','Matraman','Manggarai','Sudirman','BNI City','Karet',
      'Tanah Abang','Duri','Angke','Kampung Bandan','Jakarta Kota']
  },
  {
    key:'RANGKASBITUNG',
    name:'Rangkasbitung Line',
    route:'Tanah Abang \u2014 Rangkasbitung',
    stations:['Tanah Abang','Palmerah','Kebayoran','Pondok Ranji','Sudimara',
      'Rawa Buntu','Serpong','Cisauk','Cicayur','Parung Panjang',
      'Cilejit','Daru','Tenjo','Tigaraksa','Rangkasbitung']
  },
  {
    key:'TANGERANG',
    name:'Tangerang Line',
    route:'Duri \u2014 Tangerang',
    stations:['Duri','Grogol','Pesing','Taman Kota','Bojong Indah',
      'Rawa Buaya','Kalideres','Poris','Batu Ceper','Tanah Tinggi','Tangerang']
  },
  {
    key:'PRIOK',
    name:'Tanjung Priok Line',
    route:'Jakarta Kota \u2014 Tanjung Priok',
    stations:['Jakarta Kota','Kampung Bandan','Ancol','Tanjung Priok']
  },
];

const TIBA_VISIBLE_SECONDS = 3;

/* ===== STATE ===== */
let curStation = null;
let curDir     = 'ALL';
let nowMin = 0, nowSec = 0;
let activeTab  = 'jadwal';

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
  if(totalSec <= 0 && totalSec >= -TIBA_VISIBLE_SECONDS) return 'Tiba';
  if(totalSec <= 0) return 'Tiba';
  const m = Math.floor(totalSec/60), s = totalSec % 60;
  if(m >= 60) return `${Math.floor(m/60)}j ${m%60}m`;
  return `${pad(m)}:${pad(s)}`;
}

function cdCls(arrMin){
  const totalSec = (arrMin - nowMin)*60 - nowSec;
  if(totalSec <= 0 && totalSec >= -TIBA_VISIBLE_SECONDS) return 'now';
  if(totalSec > 0 && totalSec <= 300) return 'soon';
  return '';
}

/* ===== CLOCK ===== */
function updateClock(){
  const d = getWIB();
  nowMin = d.getHours()*60 + d.getMinutes();
  nowSec = d.getSeconds();
  document.getElementById('clock').textContent =
    `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ===== TAB SWITCH ===== */
function switchTab(tab){
  activeTab = tab;
  document.getElementById('pageJadwal').style.display = tab === 'jadwal' ? 'block' : 'none';
  document.getElementById('pageRute').style.display   = tab === 'rute'   ? 'block' : 'none';
  document.getElementById('btnJadwal').classList.toggle('active', tab === 'jadwal');
  document.getElementById('btnRute').classList.toggle('active',   tab === 'rute');
  document.getElementById('headerTitle').textContent  = tab === 'jadwal' ? 'Jadwal KRL' : 'Rute KRL';
}

/* ===== RENDER RUTE ===== */
function renderRute(){
  const container = document.getElementById('lineList');
  container.innerHTML = LINES_DATA.map((line, idx) => {
    const cfg   = LINE_CFG[line.key] || {color:'#888'};
    const count = line.stations.length;
    const stationsHtml = line.stations.map((s, i) =>
      `<div class="sl-item" style="--lc:${cfg.color}">
        <div class="sl-dot" style="border-color:${cfg.color}"></div>
        <span class="sl-name">${s}</span>
      </div>`
    ).join('');

    return `<div class="line-item" id="lineItem${idx}">
      <div class="line-header" onclick="toggleLine(${idx})">
        <div class="line-bar" style="background:${cfg.color}"></div>
        <div class="line-info">
          <div class="line-name">${line.name}</div>
          <div class="line-route">${line.route}</div>
        </div>
        <div class="line-meta">
          <span class="line-count">${count}</span>
          <svg class="line-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div class="station-list">
        <div class="station-list-inner">${stationsHtml}</div>
      </div>
    </div>`;
  }).join('');
}

function toggleLine(idx){
  const el = document.getElementById('lineItem' + idx);
  el.classList.toggle('open');
}

/* ===== GET UPCOMING ===== */
function getUpcoming(limit=20){
  const idx = STATIONS.indexOf(curStation);
  if(idx < 0) return [];
  const res = [], end = nowMin + 240;
  for(const t of SCHEDULE){
    const am = t.s[idx];
    if(am === undefined || am > end) continue;
    const totalSec = (am - nowMin)*60 - nowSec;
    if(totalSec < -TIBA_VISIBLE_SECONDS) continue;
    const dest = t.r.split(' - ').pop()?.trim() || '';
    if(curDir !== 'ALL' && dest !== curDir) continue;
    res.push({ arrival:am, dest:dest.toUpperCase(), ka:t.k, line:lineOf(t) });
  }
  res.sort((a,b) => a.arrival - b.arrival);
  return res.slice(0, limit);
}

/* ===== RENDER JADWAL ===== */
function render(){
  const heroSec = document.getElementById('heroSection');
  const listSec = document.getElementById('listSection');
  const empty   = document.getElementById('emptyState');
  const noTr    = document.getElementById('noTrains');

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

  /* HERO */
  const f   = trains[0];
  const cfg = LINE_CFG[f.line] || {name:f.line, color:'#1b8c3e'};
  const hc  = document.getElementById('heroCard');
  hc.className = `hero-card hbg-${f.line}`;

  document.getElementById('heroTime').textContent  = toStr(f.arrival);
  document.getElementById('heroBadge').textContent = cfg.name;
  document.getElementById('heroDest').textContent  = '\u2192 ' + f.dest;

  const hcd = document.getElementById('heroCD');
  hcd.textContent     = cdStr(f.arrival);
  hcd.dataset.arrival = f.arrival;

  heroSec.style.display = 'block';

  /* LIST */
  const rest = trains.slice(1);
  if(rest.length){
    listSec.style.display = 'block';
    document.getElementById('trainList').innerHTML = rest.map(tr => {
      const c  = LINE_CFG[tr.line] || {color:'#888', name:tr.line};
      const cd = cdStr(tr.arrival);
      const cl = cdCls(tr.arrival);
      return `<div class="train-item bl-${tr.line}" style="border-left-color:${c.color}">
        <span class="ti-time">${toStr(tr.arrival)}</span>
        <div class="ti-body">
          <div class="ti-dest">\u2192 ${tr.dest}</div>
          <div class="ti-sub">${c.name} \u00b7 ${tr.ka}</div>
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
    `<button class="fpill" data-dir="${d}"
      onclick="setDir(this,'${d.replace(/'/g,"\\'")}')">
      \u2192 ${d}</button>`
  ).join('');
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
  localStorage.setItem('anker_station', name);
  document.getElementById('scName').textContent = name;
  const idx   = STATIONS.indexOf(name);
  const lines = [...new Set(SCHEDULE.filter(t => t.s[idx] !== undefined).map(lineOf))];
  document.getElementById('scDot').style.background =
    LINE_CFG[lines[0]]?.color || 'var(--accent)';
  closeSearch();
  buildDirTabs();
  render();
}

/* ===== SEARCH ===== */
function openSearch(){
  document.getElementById('searchOverlay').classList.add('open');
  const input = document.getElementById('searchInput');
  input.value = '';
  renderSearch('');
  setTimeout(() => input.focus(), 80);
}

function closeSearch(){
  document.getElementById('searchOverlay').classList.remove('open');
  const input = document.getElementById('searchInput');
  input.blur();
  input.value = '';
}

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
    : STATIONS.slice(0,40);
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
  document.querySelectorAll('[data-arrival]').forEach(el => {
    const arr = parseInt(el.dataset.arrival);
    if(isNaN(arr)) return;
    el.textContent = cdStr(arr);
    const cls = cdCls(arr);
    if(el.id === 'heroCD'){
      el.className = cls ? `hero-cd ${cls}` : 'hero-cd';
    } else {
      el.className = cls ? `ti-cd ${cls}` : 'ti-cd';
    }
    el.dataset.arrival = arr;
  });

  if(curStation){
    const fresh = getUpcoming();
    const heroEl  = document.getElementById('heroCD');
    const heroArr = heroEl ? parseInt(heroEl.dataset.arrival) : null;
    if(!fresh.length || (heroArr !== null && fresh[0].arrival !== heroArr)){
      render();
    }
  }
}

function fullRefresh(){
  updateClock();
  if(curStation) render();
}

/* ===== INIT ===== */
updateClock();
renderRute();

const saved = localStorage.getItem('anker_station');
if(saved && STATIONS.includes(saved)){
  curStation = saved;
  document.getElementById('scName').textContent = saved;
  const idx   = STATIONS.indexOf(saved);
  const lines = [...new Set(SCHEDULE.filter(t => t.s[idx] !== undefined).map(lineOf))];
  document.getElementById('scDot').style.background =
    LINE_CFG[lines[0]]?.color || 'var(--accent)';
  buildDirTabs();
  render();
} else {
  render();
}

setInterval(tickSecond, 1000);
setInterval(fullRefresh, 30000);
