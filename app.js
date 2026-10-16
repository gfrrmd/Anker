/* ===== LINE CONFIG ===== */
const LINE_CFG = {
  BOGOR:         {name:'Bogor',         color:'#c62828'},
  TANGERANG:     {name:'Tangerang',     color:'#6d4c1f'},
  RANGKASBITUNG: {name:'Rangkasbitung', color:'#256329'},
  PRIOK:         {name:'Priok',         color:'#ad1457'},
  CIKARANG:      {name:'Cikarang',      color:'#1455a8'},
  NAMBO:         {name:'Nambo',         color:'#607d8b'},
};

/* ===== LINES DATA (Tab Rute) ===== */
const LINES_DATA = [
  {
    key:'BOGOR',
    name:'Bogor Line',
    route:'Jakarta Kota \u2014 Bogor',
    stations:[
      'Jakarta Kota','Jayakarta','Mangga Besar','Sawah Besar','Juanda',
      'Gondangdia','Cikini','Manggarai','Tebet','Cawang','Duren Kalibata',
      'Pasar Minggu Baru','Pasar Minggu','Tanjung Barat','Lenteng Agung',
      'Univ. Pancasila','Univ. Indonesia','Pondok Cina','Depok Baru',
      'Depok','Citayam','Bojonggede','Cilebut','Bogor'
    ]
  },
  {
    key:'NAMBO',
    name:'Nambo Branch',
    route:'Citayam \u2014 Nambo',
    stations:['Citayam','Pondok Rajeg','Cibinong','Nambo']
  },
  {
    key:'CIKARANG',
    name:'Cikarang Loop',
    route:'Cikarang \u21bb Manggarai',
    stations:[
      'Cikarang','Metland Telagamurni','Cibitung','Tambun','Bekasi Timur','Bekasi',
      'Kranji','Cakung','Klender Baru','Buaran','Klender','Jatinegara',
      'Matraman','Manggarai','Sudirman','Sudirman Baru','Karet',
      'Tanah Abang','Duri','Kampung Bandan','Rajawali','Kemayoran',
      'Pasar Senen','Gang Sentiong','Kramat','Pondok Jati'
    ]
  },
  {
    key:'RANGKASBITUNG',
    name:'Rangkasbitung Line',
    route:'Tanah Abang \u2014 Rangkasbitung',
    stations:[
      'Tanah Abang','Palmerah','Kebayoran','Pondok Ranji','Jurang Mangu',
      'Sudimara','Rawa Buntu','Serpong','Cisauk','Cicayur','Jatake',
      'Parung Panjang','Cilejit','Daru','Tenjo','Tigaraksa',
      'Cikoya','Citeras','Rangkasbitung'
    ]
  },
  {
    key:'TANGERANG',
    name:'Tangerang Line',
    route:'Duri \u2014 Tangerang',
    stations:[
      'Duri','Grogol','Pesing','Taman Kota','Bojong Indah',
      'Rawa Buaya','Kalideres','Poris','Batu Ceper','Tanah Tinggi','Tangerang'
    ]
  },
  {
    key:'PRIOK',
    name:'Tanjung Priok Line',
    route:'Jakarta Kota \u2014 Tanjung Priok',
    stations:['Jakarta Kota','Kampung Bandan','Ancol','Tanjung Priok']
  },
];

/* ===== DISPLAY NAME MAP ===== */
const DISPLAY_NAME = {
  "BNI City (Sudirman Baru)": "Sudirman Baru",
  "Bojong Gede": "Bojonggede",
  "Telagamurni": "Metland Telagamurni",
  "Universitas Indonesia": "Univ. Indonesia",
  "Universitas Pancasila": "Univ. Pancasila",
};
function dn(s){ return DISPLAY_NAME[s] || s; }

const TIBA_VISIBLE_SECONDS = 3;

/* ===== STATE ===== */
let curStation = null, curDir = 'ALL';
let nowMin = 0, nowSec = 0;
let activeTab = 'jadwal';
let searchTarget = 'jadwal';
const plan = { from:null, to:null, mode:'now', time:'08:00', results:[], cursor:0, key:'' };
const openTrips = new Set();

/* ===== UTILS ===== */
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const ic = (n, c='') => `<svg class="ic ${c}"><use href="#i-${n}"/></svg>`;
const esc = s => String(s).replace(/'/g,"\\'");
const NS = STATIONS.length;
const sIdx = name => STATIONS.indexOf(name);

function getWIB(){
  const n = new Date();
  return new Date(n.getTime() + n.getTimezoneOffset()*60000 + 7*3600000);
}
function toStr(m){ return m == null ? '--:--' : `${pad(Math.floor(m/60)%24)}:${pad(m%60)}`; }
function nowF(){ return nowMin + nowSec/60; }
function lineOf(t){ return LINE_MAP[t.l] || t.l; }
function durStr(m){ return m >= 60 ? `${Math.floor(m/60)} j ${m%60} mnt` : `${m} mnt`; }
function lc(key){ return (LINE_CFG[key] && LINE_CFG[key].color) || '#16a34a'; }
function ln(key){ return (LINE_CFG[key] && LINE_CFG[key].name) || key; }

function cdStr(arrMin){
  const total = (arrMin - nowMin)*60 - nowSec;
  if(total <= 0) return 'Tiba';
  const m = Math.floor(total/60), s = total % 60;
  if(m >= 60) return `${Math.floor(m/60)}j ${m%60}m`;
  return `${pad(m)}:${pad(s)}`;
}
function cdCls(arrMin){
  const total = (arrMin - nowMin)*60 - nowSec;
  if(total <= 0 && total >= -TIBA_VISIBLE_SECONDS) return 'now';
  if(total > 0 && total <= 300) return 'soon';
  return '';
}

/* ===== TRIPS (urut per waktu, sembunyikan KA yang batal hari ini) ===== */
let TRIPS = null;
function trips(){
  if(TRIPS) return TRIPS;
  const weekend = [0,6].includes(getWIB().getDay());
  TRIPS = [];
  SCHEDULE.forEach((t,i) => {
    if(weekend && /Batal/.test(t.n) && /Sabtu|Minggu/.test(t.n)) return;
    const st = Object.entries(t.s).map(([k,v]) => ({s:+k, t:v})).sort((a,b) => a.t-b.t);
    const parts = t.r.split(' - ');
    TRIPS.push({ id:i, line:lineOf(t), ka:t.k, r:t.r, org:parts[0].trim(), dest:parts[parts.length-1].split('/').pop().trim(), st, m:t.s });
  });
  return TRIPS;
}

/* ===== CLOCK ===== */
function updateClock(){
  const d = getWIB();
  nowMin = d.getHours()*60 + d.getMinutes();
  nowSec = d.getSeconds();
  $('clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ===== TABS ===== */
const TABS = ['jadwal','rute','jalur'];
const TAB_TITLE = { jadwal:'Jadwal KRL', rute:'Cek Rute', jalur:'Jalur KRL' };
function switchTab(tab){
  const prev = activeTab;
  activeTab = tab;
  localStorage.setItem('anker_tab', tab);
  TABS.forEach(t => {
    const pg = $('page' + t[0].toUpperCase() + t.slice(1));
    const show = t === tab;
    if(show){
      pg.hidden = false;
      if(prev !== tab){ pg.classList.remove('enter'); void pg.offsetWidth; pg.classList.add('enter'); }
    } else pg.hidden = true;
    $('btn' + t[0].toUpperCase() + t.slice(1)).classList.toggle('active', show);
  });
  $('headerTitle').textContent = TAB_TITLE[tab];
  $('navPill').style.transform = `translateX(${TABS.indexOf(tab)*100}%)`;
  if(tab !== 'jalur') requestAnimationFrame(positionBadges);
}

/* ===== TIMELINE (bullet kereta berjalan) ===== */
function tlRows(stops, opts={}){
  return stops.map((s,i) => {
    const first = i === 0, last = i === stops.length-1;
    return `<div class="tl-row${first?' first':''}${last?' last':''}" data-t="${s.t}">
      <span class="tl-dot"></span>
      <div class="tl-txt"><b>${dn(STATIONS[s.s])}</b><small class="tl-st"></small></div>
      <span class="tl-time">${toStr(s.t)}</span>
    </div>`;
  }).join('');
}
function timeline(stops, color, live=true){
  return `<div class="tl${live?' live':''}" style="--lc:${color}" data-first="${stops[0].t}" data-last="${stops[stops.length-1].t}">
    <span class="tl-track"></span><span class="tl-ahead"></span>
    ${live ? `<span class="tl-badge">${ic('train')}</span>` : ''}
    ${tlRows(stops)}
  </div>`;
}

/* posisi bullet mengikuti jadwal: interpolasi antar perhentian */
function positionBadges(){
  const now = nowMin*60 + nowSec;
  document.querySelectorAll('.tl.live').forEach(tl => {
    if(!tl.offsetParent) return;
    const rows = [...tl.querySelectorAll('.tl-row')];
    let nextSet = false, y = null, status = 'before';
    rows.forEach((r,i) => {
      const t = +r.dataset.t*60;
      const passed = t <= now;
      r.classList.toggle('passed', passed);
      const isNext = !passed && !nextSet;
      if(isNext) nextSet = true;
      r.classList.toggle('next', isNext);
      const st = r.querySelector('.tl-st'); if(st) st.textContent = passed ? 'Sudah berangkat' : 'Dijadwalkan';
    });
    const top0 = tl.getBoundingClientRect().top;
    const center = r => {
      const m = r.closest('.mid:not(.open)');
      const bb = (m ? m.querySelector('.mid-btn') : r).getBoundingClientRect();
      return bb.top - top0 + bb.height/2;
    };
    const firstT = +rows[0].dataset.t*60, lastT = +rows[rows.length-1].dataset.t*60;
    if(now < firstT) status = 'before';
    else if(now >= lastT) status = 'after';
    else {
      status = 'run';
      for(let i=0;i<rows.length-1;i++){
        const a = +rows[i].dataset.t*60, b = +rows[i+1].dataset.t*60;
        if(now >= a && now < b){
          const f = b === a ? 0 : (now-a)/(b-a);
          y = center(rows[i]) + (center(rows[i+1]) - center(rows[i]))*f;
          break;
        }
      }
    }
    const badge = tl.querySelector('.tl-badge'), ahead = tl.querySelector('.tl-ahead');
    tl.dataset.status = status;
    if(status === 'run'){
      badge.style.transform = `translateY(${y-15}px)`;
      ahead.style.top = y + 'px';
    } else if(status === 'before'){
      const y0 = center(rows[0]);
      badge.style.transform = `translateY(${y0-15}px)`; ahead.style.top = y0 + 'px';
    } else {
      const y1 = center(rows[rows.length-1]);
      badge.style.transform = `translateY(${y1-15}px)`; ahead.style.top = y1 + 'px';
    }
  });
}
function settleBadges(ms=420){
  const t0 = performance.now();
  (function f(){ positionBadges(); if(performance.now()-t0 < ms) requestAnimationFrame(f); })();
}

/* ===== COLLAPSE helper ===== */
function toggleOpen(el, force){
  const open = force !== undefined ? force : !el.classList.contains('open');
  el.classList.toggle('open', open);
  return open;
}

/* ===== JALUR (daftar stasiun statis) ===== */
function renderRute(){
  $('lineList').innerHTML = LINES_DATA.map((line, idx) => {
    const c = lc(line.key);
    const rows = line.stations.map(n => `<div class="sl-item"><span class="sl-dot"></span><span class="sl-name">${n}</span></div>`).join('');
    return `<div class="line-item" id="lineItem${idx}" style="--lc:${c}">
      <button class="line-header" onclick="toggleOpen($('lineItem${idx}'))">
        <span class="line-bar"></span>
        <span class="line-info"><span class="line-name">${line.name}</span><span class="line-route">${line.route}</span></span>
        <span class="line-meta"><span class="line-count">${line.stations.length} stasiun</span>${ic('chev','line-chevron')}</span>
      </button>
      <div class="collapse"><div><div class="sl-list">${rows}</div></div></div>
    </div>`;
  }).join('');
}

/* ===== JADWAL ===== */
function getUpcoming(limit=20){
  const idx = sIdx(curStation);
  if(idx < 0) return [];
  const res = [], end = nowMin + 240;
  for(const t of trips()){
    const am = t.m[idx];
    if(am === undefined || am > end) continue;
    if((am - nowMin)*60 - nowSec < -TIBA_VISIBLE_SECONDS) continue;
    if(curDir !== 'ALL' && t.dest !== curDir) continue;
    res.push({ arrival:am, dest:t.dest.toUpperCase(), ka:t.ka, line:t.line, trip:t });
  }
  res.sort((a,b) => a.arrival - b.arrival);
  return res.slice(0, limit);
}

function setHidden(id, h){ $(id).hidden = h; }

function render(){
  if(!curStation){
    setHidden('heroSection',true); setHidden('listSection',true); setHidden('noTrains',true); setHidden('emptyState',false);
    return;
  }
  setHidden('emptyState', true);
  const list = getUpcoming();
  if(!list.length){
    setHidden('heroSection',true); setHidden('listSection',true); setHidden('noTrains',false);
    return;
  }
  setHidden('noTrains', true);
  const f = list[0], hc = $('heroCard');
  const changed = hc.dataset.key !== f.ka + ':' + f.arrival;
  hc.style.setProperty('--hc', lc(f.line));
  hc.dataset.key = f.ka + ':' + f.arrival;
  $('heroTime').textContent  = toStr(f.arrival);
  $('heroBadge').textContent = ln(f.line);
  $('heroDest').textContent  = f.dest;
  const hcd = $('heroCD');
  hcd.textContent = cdStr(f.arrival);
  hcd.dataset.arrival = f.arrival;
  setHidden('heroSection', false);
  if(changed){ hc.classList.remove('swap'); void hc.offsetWidth; hc.classList.add('swap'); }

  const rest = list.slice(1);
  if(!rest.length){ setHidden('listSection', true); return; }
  setHidden('listSection', false);
  const idx = sIdx(curStation);
  $('trainList').innerHTML = rest.map((tr,i) => {
    const key = tr.trip.id + ':' + tr.arrival;
    const stops = tr.trip.st.filter(s => s.t >= tr.arrival || s.s === idx);
    const open = openTrips.has(key);
    return `<div class="train-item${open?' open':''}" data-key="${key}" data-trip="${tr.trip.id}" style="--lc:${lc(tr.line)};--i:${i}">
      <button class="ti-main" onclick="toggleTrain(this.parentNode)">
        <span class="ti-time">${toStr(tr.arrival)}</span>
        <span class="ti-body">
          <span class="ti-dest">${ic('arrow','mini')}${tr.dest}</span>
          <span class="ti-sub">${ln(tr.line)} · KA ${tr.ka}</span>
        </span>
        <span class="ti-cd ${cdCls(tr.arrival)}" data-arrival="${tr.arrival}">${cdStr(tr.arrival)}</span>
        ${ic('chev','ti-chev')}
      </button>
      <div class="collapse"><div><div class="ti-detail hide-passed">${open ? timeline(tr.trip.st, lc(tr.line)) : ''}</div></div></div>
    </div>`;
  }).join('');
  if(openTrips.size) settleBadges();
}
function toggleTrain(el){
  const key = el.dataset.key, trip = trips().find(t => t.id === +el.dataset.trip);
  const open = toggleOpen(el);
  open ? openTrips.add(key) : openTrips.delete(key);
  const box = el.querySelector('.ti-detail');
  if(open && !box.innerHTML) box.innerHTML = timeline(trip.st, lc(trip.line));
  settleBadges(480);
}

function buildDirTabs(){
  const idx = sIdx(curStation), set = new Set();
  trips().forEach(t => { if(t.m[idx] !== undefined) set.add(t.dest); });
  $('dirBtns').innerHTML = [...set].sort().map(d =>
    `<button class="fpill" data-dir="${d}" onclick="setDir(this,'${esc(d)}')">${ic('arrow','mini')}${d}</button>`).join('');
  document.querySelectorAll('#dirRow .fpill').forEach(b => b.classList.remove('active'));
  document.querySelector('#dirRow .fpill[data-dir="ALL"]').classList.add('active');
  $('dirRow').hidden = false;
}
function setDir(btn, dir){
  curDir = dir;
  document.querySelectorAll('#dirRow .fpill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}
function stationColor(name){
  const idx = sIdx(name);
  const l = trips().find(t => t.m[idx] !== undefined);
  return l ? lc(l.line) : 'var(--accent)';
}
function selectStation(name){
  curStation = name; curDir = 'ALL';
  localStorage.setItem('anker_station', name);
  $('scName').textContent = dn(name);
  $('scDot').style.background = stationColor(name);
  buildDirTabs();
  render();
}

/* ===== SEARCH ===== */
const POPULAR = ['Manggarai','Tanah Abang','Jakarta Kota','Sudirman','Bogor','Bekasi','Duri','Depok','Rangkasbitung','Tangerang'];
function getRecent(){ try{ return JSON.parse(localStorage.getItem('anker_recent')||'[]').filter(s => STATIONS.includes(s)); }catch(e){ return []; } }
function pushRecent(name){
  const r = [name, ...getRecent().filter(s => s !== name)].slice(0,5);
  localStorage.setItem('anker_recent', JSON.stringify(r));
}
function openSearch(target='jadwal'){
  searchTarget = target;
  $('searchTitle').textContent = { jadwal:'Pilih stasiun kamu', from:'Stasiun asal', to:'Stasiun tujuan' }[target];
  $('searchOverlay').classList.add('open');
  const input = $('searchInput'); input.value = '';
  renderSearch('');
  setTimeout(() => input.focus(), 120);
}
function closeSearch(){
  $('searchOverlay').classList.remove('open');
  $('searchInput').blur(); $('searchInput').value = '';
}
function handleOverlayClick(e){ if(e.target === $('searchOverlay')) closeSearch(); }
function pickStation(name){
  pushRecent(name);
  closeSearch();
  if(searchTarget === 'jadwal') selectStation(name);
  else setPlanStation(searchTarget, name);
}
$('searchInput').addEventListener('input', e => renderSearch(e.target.value.trim()));

function stationLines(name){
  const idx = sIdx(name);
  return [...new Set(trips().filter(t => t.m[idx] !== undefined).map(t => t.line))];
}
function hl(name, q){
  const i = name.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? name : `${name.slice(0,i)}<em>${name.slice(i,i+q.length)}</em>${name.slice(i+q.length)}`;
}
function resultRow(s, q=''){
  const ls = stationLines(s);
  const dots = ls.map(l => `<span class="si-dot" style="background:${lc(l)}"></span>`).join('');
  return `<button class="search-item" onclick="pickStation('${esc(s)}')">
    <span class="si-dots">${dots}</span>
    <span class="si-name">${q ? hl(dn(s), q) : dn(s)}</span>
    <span class="si-lines">${ls.map(ln).join(', ')}</span></button>`;
}
function renderSearch(q){
  const el = $('searchBody');
  if(!q){
    const rec = getRecent();
    el.innerHTML = `
      <div class="search-hint">${ic('search')}<p>Ketik nama stasiun, misalnya <b>Manggarai</b> atau <b>Bekasi</b>. Tersedia ${NS} stasiun KRL Jabodetabek.</p></div>
      ${rec.length ? `<div class="sb-label">Terakhir dipakai</div><div class="sb-list">${rec.map(s => resultRow(s)).join('')}</div>` : ''}
      <div class="sb-label">Stasiun besar</div>
      <div class="pop-chips">${POPULAR.filter(s => STATIONS.includes(s)).map(s => `<button class="pchip" onclick="pickStation('${esc(s)}')">${dn(s)}</button>`).join('')}</div>`;
    return;
  }
  const lower = q.toLowerCase();
  const hits = STATIONS.filter(s => dn(s).toLowerCase().includes(lower) || s.toLowerCase().includes(lower))
    .sort((a,b) => (dn(b).toLowerCase().startsWith(lower)) - (dn(a).toLowerCase().startsWith(lower)) || dn(a).localeCompare(dn(b)));
  el.innerHTML = hits.length
    ? `<div class="sb-label">${hits.length} stasiun ditemukan</div><div class="sb-list">${hits.map(s => resultRow(s, q)).join('')}</div>`
    : `<div class="search-hint miss">${ic('search')}<p>Tidak ada stasiun bernama <b>“${q.replace(/</g,'&lt;')}”</b>. Periksa ejaan atau coba sebagian katanya saja.</p></div>`;
}

/* ===== RENCANA PERJALANAN (RAPTOR) ===== */
function raptor(o, d, T, maxK=4){
  const INF = 1e9, TR = 2, TS = trips();
  const best = new Array(NS).fill(INF);
  const tau = [new Array(NS).fill(INF)], par = [{}];
  tau[0][o] = T; best[o] = T;
  const out = [];
  for(let k=1; k<=maxK; k++){
    tau[k] = new Array(NS).fill(INF); par[k] = {};
    for(const tr of TS){
      let b = -1;
      for(let j=0; j<tr.st.length; j++){
        const {s,t} = tr.st[j];
        if(b >= 0 && t < best[s]){ tau[k][s] = t; best[s] = t; par[k][s] = {tr, from:b, to:j}; }
        if(b < 0){
          const p = tau[k-1][s];
          if(p < INF && p + (k===1 ? 0 : TR) <= t) b = j;
        }
      }
    }
    if(tau[k][d] < INF){
      const legs = []; let s = d;
      for(let kk=k; kk>=1; kk--){
        const p = par[kk][s];
        legs.unshift({ tr:p.tr, from:p.from, to:p.to });
        s = p.tr.st[p.from].s;
      }
      out.push(mkJourney(legs));
    }
  }
  return out;
}
function mkJourney(legs){
  const first = legs[0], last = legs[legs.length-1];
  return { legs, dep:first.tr.st[first.from].t, arr:last.tr.st[last.to].t,
    key: legs.map(l => l.tr.id + ':' + l.from).join('|') };
}
function findJourneys(o, d, T, want=5){
  const out = [], seen = new Set();
  let t = T, guard = 0;
  while(out.length < want && t < 1440 && guard++ < 12){
    const js = raptor(o, d, t);
    if(!js.length) break;
    js.forEach(j => { if(!seen.has(j.key)){ seen.add(j.key); out.push(j); } });
    t = Math.min(...js.map(j => j.dep)) + 1;
  }
  const dom = (a,b) => a !== b && b.dep >= a.dep && b.arr <= a.arr && b.legs.length <= a.legs.length;
  return out.filter(a => !out.some(b => dom(a,b))).sort((a,b) => a.dep - b.dep || a.arr - b.arr).slice(0, want);
}

function setPlanStation(which, name){
  plan[which] = name;
  const el = $(which === 'from' ? 'pfFrom' : 'pfTo');
  el.textContent = dn(name); el.classList.remove('ph');
  localStorage.setItem('anker_plan', JSON.stringify({from:plan.from, to:plan.to}));
  if(plan.from && plan.to) runPlan();
}
function swapPlan(){
  const b = document.querySelector('.swap-btn svg');
  b.style.transform = `rotate(${(b._r = (b._r||0) + 180)}deg)`;
  const f = plan.from, t = plan.to;
  plan.from = plan.to = null;
  $('pfFrom').textContent = 'Pilih stasiun asal'; $('pfFrom').classList.add('ph');
  $('pfTo').textContent = 'Pilih stasiun tujuan'; $('pfTo').classList.add('ph');
  if(t) setPlanStationQuiet('from', t);
  if(f) setPlanStationQuiet('to', f);
  if(plan.from && plan.to) runPlan();
}
function setPlanStationQuiet(which, name){
  plan[which] = name;
  const el = $(which === 'from' ? 'pfFrom' : 'pfTo');
  el.textContent = dn(name); el.classList.remove('ph');
}
function setTimeMode(m){
  plan.mode = m;
  document.querySelectorAll('#timeSeg button').forEach(b => b.classList.toggle('active', b.dataset.m === m));
  $('segThumb').style.transform = `translateX(${m === 'time' ? 100 : 0}%)`;
  $('timeBox').classList.toggle('open', m === 'time');
  if(m === 'time' && !$('timeInput').dataset.touched){
    $('timeInput').value = `${pad(Math.floor(nowMin/60))}:${pad(nowMin%60)}`;
  }
  if(plan.from && plan.to && plan.results.length) runPlan();
}
$('timeInput').addEventListener('change', e => { e.target.dataset.touched = 1; if(plan.from && plan.to) runPlan(); });

function startMinutes(){
  if(plan.mode === 'now') return nowMin;
  const [h,m] = ($('timeInput').value || '00:00').split(':').map(Number);
  return h*60 + m;
}
function runPlan(){
  const out = $('planOut');
  if(!plan.from || !plan.to){
    out.innerHTML = `<div class="plan-note">${ic('route')}<p>Pilih stasiun asal dan tujuan dulu.</p></div>`;
    return;
  }
  if(plan.from === plan.to){
    out.innerHTML = `<div class="plan-note">${ic('route')}<p>Asal dan tujuan sama. Pilih stasiun yang berbeda.</p></div>`;
    return;
  }
  const T = startMinutes();
  plan.start = T;
  plan.results = findJourneys(sIdx(plan.from), sIdx(plan.to), T, 5);
  plan.cursor = plan.results.length ? plan.results[plan.results.length-1].dep + 1 : T;
  renderPlan();
}
function morePlan(){
  const js = findJourneys(sIdx(plan.from), sIdx(plan.to), plan.cursor, 4);
  const have = new Set(plan.results.map(j => j.key));
  const add = js.filter(j => !have.has(j.key));
  if(!add.length){ plan.exhausted = true; }
  plan.results = plan.results.concat(add);
  if(add.length) plan.cursor = add[add.length-1].dep + 1;
  renderPlan(true);
}
function legPill(l){
  const c = lc(l.tr.line);
  return `<span class="lpill" style="--lc:${c}"><i></i>${ln(l.tr.line)}</span>`;
}
function renderPlan(keepOpen){
  const out = $('planOut'), rs = plan.results;
  const openSet = new Set([...document.querySelectorAll('.jcard.open')].map(e => e.dataset.key));
  if(!rs.length){
    out.innerHTML = `<div class="plan-note">${ic('clock')}<p>Tidak ada kereta dari <b>${dn(plan.from)}</b> ke <b>${dn(plan.to)}</b> setelah pukul ${toStr(plan.start)}. Coba jam lebih pagi.</p></div>`;
    return;
  }
  const durs = rs.map(j => j.arr - j.dep), mn = Math.min(...durs), mx = Math.max(...durs);
  const est = mn === mx ? durStr(mn) : `${mn}–${mx} mnt`;
  out.innerHTML = `
    <div class="sum-card">
      <div><small>Perkiraan waktu tempuh</small><b>${est}</b></div>
      <div class="sum-route"><span>${dn(plan.from)}</span>${ic('arrow','mini')}<span>${dn(plan.to)}</span></div>
    </div>
    <div class="seg-label">Pilihan keberangkatan mulai ${toStr(plan.start)}</div>
    <div class="jlist">${rs.map((j,i) => jCard(j, i, openSet.has(j.key))).join('')}</div>
    ${plan.exhausted ? '' : `<button class="btn-soft wide" onclick="morePlan()">Tampilkan jadwal berikutnya</button>`}`;
  settleBadges(60);
}
function jCard(j, i, open){
  const dur = j.arr - j.dep, tr = j.legs.length - 1;
  const wait = j.dep - nowMin;
  const waitTxt = plan.mode === 'now' ? (wait <= 0 ? 'Berangkat sekarang' : `Berangkat ${wait} mnt lagi`) : `KA ${j.legs[0].tr.ka}`;
  const pills = j.legs.map((l,k) => (k ? `<span class="lsep">${ic('arrow','mini')}</span>` : '') + legPill(l)).join('');
  return `<div class="jcard${open?' open':''}" data-key="${j.key}" style="--i:${i}">
    <button class="j-main" onclick="toggleJ(this.parentNode)">
      <div class="j-times"><b>${toStr(j.dep)}</b>${ic('arrow','mini')}<b>${toStr(j.arr)}</b><span class="j-dur">${durStr(dur)}</span></div>
      <div class="j-pills">${pills}</div>
      <div class="j-meta"><span>${waitTxt}</span><span>${tr === 0 ? 'Langsung' : tr + ' transit'}</span>${ic('chev','ti-chev')}</div>
    </button>
    <div class="collapse"><div><div class="j-detail">${jDetail(j)}</div></div></div>
  </div>`;
}
function toggleJ(el){ toggleOpen(el); settleBadges(500); }
function jDetail(j){
  return j.legs.map((l,k) => {
    const c = lc(l.tr.line), stops = l.tr.st.slice(l.from, l.to+1);
    const mid = stops.length - 2;
    const rows = tlRows(stops);
    const first = stops[0], last = stops[stops.length-1];
    let transit = '';
    if(k > 0){
      const prev = j.legs[k-1], pa = prev.tr.st[prev.to].t, dp = first.t;
      transit = `<div class="transit">${ic('swap-h')}<span>Transit di <b>${dn(STATIONS[first.s])}</b>, tunggu ${dp - pa} mnt</span></div>`;
    }
    return `${transit}<div class="leg" style="--lc:${c}">
      <div class="leg-head">${legPill(l)}<span>KA ${l.tr.ka} · arah ${dn(l.tr.dest)}</span></div>
      <div class="tl live leg-tl" style="--lc:${c}">
        <span class="tl-track"></span><span class="tl-ahead"></span><span class="tl-badge">${ic('train')}</span>
        ${stopsWithMid(stops)}
      </div>
    </div>`;
  }).join('');
}
function stopsWithMid(stops){
  const n = stops.length;
  const row = (s,cls) => `<div class="tl-row ${cls}" data-t="${s.t}"><span class="tl-dot"></span><div class="tl-txt"><b>${dn(STATIONS[s.s])}</b></div><span class="tl-time">${toStr(s.t)}</span></div>`;
  if(n <= 2) return stops.map((s,i) => row(s, i===0?'first':'last')).join('');
  const mids = stops.slice(1, -1);
  return row(stops[0],'first') +
    `<div class="mid ${n > 7 ? '' : 'open'}"><button class="mid-btn" onclick="this.parentNode.classList.toggle('open');settleBadges(500)">${ic('chev')}<span>${mids.length} perhentian di antara</span></button>
      <div class="collapse"><div>${mids.map(s => row(s,'')).join('')}</div></div></div>` +
    row(stops[n-1],'last');
}

/* ===== TICK ===== */
function tickSecond(){
  updateClock();
  document.querySelectorAll('[data-arrival]').forEach(el => {
    const arr = parseInt(el.dataset.arrival);
    if(isNaN(arr)) return;
    el.textContent = cdStr(arr);
    const cls = cdCls(arr);
    el.className = (el.id === 'heroCD' ? 'hero-cd' : 'ti-cd') + (cls ? ' ' + cls : '');
  });
  if(curStation && activeTab === 'jadwal'){
    const fresh = getUpcoming();
    const heroArr = parseInt($('heroCD').dataset.arrival);
    if(!fresh.length || fresh[0].arrival !== heroArr) render();
  }
  positionBadges();
}
function fullRefresh(){ updateClock(); if(curStation) render(); }

/* ===== INIT ===== */
updateClock();
renderRute();
switchTab(localStorage.getItem('anker_tab') || 'jadwal');
$('navPill').style.transition = 'none'; $('navPill').style.transform = `translateX(${TABS.indexOf(activeTab)*100}%)`;
requestAnimationFrame(() => $('navPill').style.transition = '');

const saved = localStorage.getItem('anker_station');
if(saved && STATIONS.includes(saved)){
  curStation = saved;
  $('scName').textContent = dn(saved);
  $('scDot').style.background = stationColor(saved);
  buildDirTabs();
}
render();
try{
  const p = JSON.parse(localStorage.getItem('anker_plan') || '{}');
  if(p.from && STATIONS.includes(p.from)) setPlanStationQuiet('from', p.from);
  if(p.to && STATIONS.includes(p.to)) setPlanStationQuiet('to', p.to);
}catch(e){}

setInterval(tickSecond, 1000);
setInterval(fullRefresh, 30000);
