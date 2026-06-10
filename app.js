// ============================================================
//  USUARIOS DEL SISTEMA
// ============================================================
const USERS = {
  dvalverde: { name: 'Dennis Valverde', role: 'Backup', project: 'backup', chipClass: 'orange' },
  deiby:     { name: 'Deiby Campos', role: 'Coordinador CCSS', project: 'ccss', chipClass: '' },
  sebastian: { name: 'Sebastián Madriz', role: 'Coordinador AyA', project: 'aya', chipClass: 'green' },
  lorna:     { name: 'Lorna Vega', role: 'Supervisora', project: 'super', chipClass: 'purple' }
};

const DEFAULT_PASSWORDS = {
  dvalverde: 'backup2024',
  deiby: 'ccss2024',
  sebastian: 'aya2024',
  lorna: 'super2024'
};

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOWS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// ============================================================
// ESTADO
// ============================================================
let sb = null;
let currentUser = null;
let requests = [];
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();
const today   = new Date();

// ============================================================
// INIT
// ============================================================
function initSupabase() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ============================================================
// LOGIN
// ============================================================
async function doLogin() {
  const username = document.getElementById('login-user').value.trim().toLowerCase();
  const pass     = document.getElementById('login-pass').value;
  const errEl    = document.getElementById('login-error');

  if (!USERS[username]) {
    errEl.textContent = 'Usuario no encontrado';
    errEl.style.display = 'block';
    return;
  }

  const stored = await getStoredPassword(username);

  let valid = false;
  let first = false;

  if (stored) valid = stored.password === pass;
  else {
    valid = DEFAULT_PASSWORDS[username] === pass;
    first = true;
  }

  if (!valid) {
    errEl.textContent = 'Contraseña incorrecta';
    errEl.style.display = 'block';
    return;
  }

  currentUser = username;
  sessionStorage.setItem('backup_user', username);

  if (first) showChangePassword(true);
  else showApp();
}

async function getStoredPassword(username) {
  const { data } = await sb.from('passwords').select('*').eq('username', username).single();
  return data || null;
}

// ============================================================
// APP
// ============================================================
async function showApp() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');

  const u = USERS[currentUser];
  const chip = document.getElementById('nav-user');
  chip.textContent = u.name;
  chip.className = 'user-chip ' + u.chipClass;

  await loadRequests();
}

async function loadRequests() {
  const { data } = await sb.from('reservas').select('*');
  requests = data || [];
  render();
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
function render() {
  renderCalendar();
  renderRequests();
  renderStats();
  renderTodayStatus();
}

// ============================================================
// HOY
// ============================================================
function renderTodayStatus() {
  const key = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const el  = document.getElementById('today-location');

  const dr = getDayRequests(key).filter(r => r.estado === 'approved');

  if (!dr.length) {
    el.className = 'status-indicator status-none';
    el.textContent = 'Sin asignación';
    return;
  }

  if (dr.length === 1) {
    el.className = 'status-indicator status-' + dr[0].proyecto;
    el.textContent = dr[0].proyecto.toUpperCase();
  } else {
    el.className = 'status-indicator status-none';
    el.textContent = 'Conflicto';
  }
}

// ============================================================
// CALENDARIO
// ============================================================
function renderCalendar() {
  document.getElementById('cal-title').textContent =
    MONTHS[viewMonth] + ' ' + viewYear;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  DOWS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  const first = new Date(viewYear, viewMonth, 1).getDay();
  const total = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < first; i++) {
    grid.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= total; d++) {
    const el = document.createElement('div');
    el.className = 'cal-day';

    const fecha = dateKey(viewYear, viewMonth, d);
    const dr = getDayRequests(fecha).filter(r => r.estado !== 'rejected');

    el.innerHTML = `<div class="day-num">${d}</div>`;

    // COLOR + TOOLTIP
    if (dr.length === 1) {
      el.classList.add(dr[0].proyecto + '-day');
      el.setAttribute('data-tooltip',
        dr[0].nombre + ' - ' + dr[0].proyecto.toUpperCase()
      );
    }

    if (hasConflict(fecha)) {
      el.setAttribute('data-tooltip', 'Conflicto');
    }

    el.onclick = () => openDayModal(fecha);

    grid.appendChild(el);
  }
}

// ============================================================
// REQUESTS
// ============================================================
function renderRequests() {
  const list = document.getElementById('req-list');

  list.innerHTML = requests.map(r =>
    `<div>${r.fecha} - ${r.nombre}</div>`
  ).join('');
}

// ============================================================
// STATS
// ============================================================
function renderStats(){}

// ============================================================
// HELPERS
// ============================================================
function getDayRequests(f){return requests.filter(r=>r.fecha===f)}
function hasConflict(f){return getDayRequests(f).length>1}
function dateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}

// ============================================================
// MODAL (simple)
// ============================================================
function openDayModal(fecha){
  document.getElementById('modal-title').textContent = fecha;
  document.getElementById('modal').classList.add('open');
}
function closeModal(){
  document.getElementById('modal').classList.remove('open');
}

// ============================================================
// INIT
// ============================================================
initSupabase();

const savedUser = sessionStorage.getItem('backup_user');
if (savedUser) {
  currentUser = savedUser;
  showApp();
}
