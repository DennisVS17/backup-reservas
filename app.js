// ============================================================
//  USUARIOS DEL SISTEMA
// ============================================================
const USERS = {
  dvalverde: { name: 'Dennis Valverde', role: 'Backup',            project: 'backup', chipClass: 'orange' },
  deiby:     { name: 'Deiby Campos',    role: 'Coordinador CCSS',  project: 'ccss',   chipClass: '' },
  sebastian: { name: 'Sebastián Madriz',role: 'Coordinador AyA',   project: 'aya',    chipClass: 'green' },
  lorna:     { name: 'Lorna Vega',      role: 'Supervisora',       project: 'super',  chipClass: 'purple' }
};

// Contraseñas por defecto — si el usuario tiene contraseña guardada en Supabase, esa tiene prioridad
const DEFAULT_PASSWORDS = {
  dvalverde: 'backup2024',
  deiby:     'ccss2024',
  sebastian: 'aya2024',
  lorna:     'super2024'
};

const FIRST_LOGIN_USERS = new Set(['deiby', 'sebastian', 'lorna', 'dvalverde']);

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOWS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// ============================================================
//  ESTADO
// ============================================================
let sb = null;
let currentUser = null;
let requests = [];
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();
const today   = new Date();

// ============================================================
//  INIT SUPABASE
// ============================================================
function initSupabase() {
  try {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch(e) {
    console.error('Error iniciando Supabase:', e);
  }
}

// ============================================================
//  CONTRASEÑAS
// ============================================================
async function getStoredPassword(username) {
  try {
    const { data, error } = await sb
      .from('passwords')
      .select('password, first_login')
      .eq('username', username)
      .single();

    if (error || !data) return null;
    return data;
  } catch(e) {
    return null;
  }
}

async function savePassword(username, password) {
  try {
    const { error } = await sb
      .from('passwords')
      .upsert(
        { username, password, first_login: false },
        { onConflict: 'username' }
      );

    if (error) throw error;
  } catch(e) {
    console.error('Error guardando contraseña:', e);
  }
}

// ============================================================
//  LOGIN
// ============================================================
async function doLogin() {
  const username = document.getElementById('login-user').value.trim().toLowerCase();
  const pass     = document.getElementById('login-pass').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  if (!USERS[username]) {
    errEl.textContent = 'Usuario no encontrado.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verificando…';

  const stored = await getStoredPassword(username);

  let validPassword = false;
  let isFirstLogin  = false;

  if (stored) {
    validPassword = stored.password === pass;
    isFirstLogin  = false;
  } else {
    validPassword = DEFAULT_PASSWORDS[username] === pass;
    isFirstLogin  = true;
  }

  btn.disabled = false;
  btn.textContent = 'Entrar';

  if (!validPassword) {
    errEl.textContent = 'Usuario o contraseña incorrectos.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  currentUser = username;
  sessionStorage.setItem('backup_user', username);

  if (isFirstLogin) {
    showChangePassword(true);
  } else {
    showApp();
  }
}

function doLogout() {
  currentUser = null;
  sessionStorage.removeItem('backup_user');

  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('change-pass-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');

  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

// ============================================================
//  CAMBIO DE CONTRASEÑA
// ============================================================
function showChangePassword(isFirst = false) {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('change-pass-screen').classList.add('active');

  const title = document.getElementById('cp-title');
  const sub   = document.getElementById('cp-sub');

  if (isFirst) {
    title.textContent = '¡Bienvenido/a, ' + USERS[currentUser].name.split(' ')[0] + '!';
    sub.textContent   = 'Es tu primer acceso. Por favor establecé tu contraseña personal.';
  } else {
    title.textContent = 'Cambiar contraseña';
    sub.textContent   = 'Ingresá tu nueva contraseña.';
  }

  document.getElementById('cp-new').value     = '';
  document.getElementById('cp-confirm').value = '';
  document.getElementById('cp-error').style.display = 'none';
}

async function saveNewPassword() {
  const newPass  = document.getElementById('cp-new').value;
  const confirm  = document.getElementById('cp-confirm').value;
  const errEl    = document.getElementById('cp-error');
  const btn      = document.getElementById('cp-btn');

  if (newPass.length < 6) {
    errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    errEl.style.display = 'block';
    return;
  }

  if (newPass !== confirm) {
    errEl.textContent = 'Las contraseñas no coinciden.';
    errEl.style.display = 'block';
    return;
  }

  if (newPass === DEFAULT_PASSWORDS[currentUser]) {
    errEl.textContent = 'No podés usar la contraseña genérica. Elegí una personal.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  await savePassword(currentUser, newPass);

  btn.disabled = false;
  btn.textContent = 'Guardar y entrar';

  showToast('¡Contraseña guardada! ✓');
  document.getElementById('change-pass-screen').classList.remove('active');
  showApp();
}

// ============================================================
//  MOSTRAR APP
// ============================================================
async function showApp() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('change-pass-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');

  const u = USERS[currentUser];
  const chip = document.getElementById('nav-user');

  chip.textContent = u.name + ' · ' + u.role;
  chip.className = 'user-chip ' + u.chipClass;

  const changePassBtn = document.getElementById('change-pass-btn');
  if (changePassBtn) {
    changePassBtn.style.display = 'inline-block';
  }

  const reqCard       = document.getElementById('request-card');
  const approveAllBtn = document.getElementById('approve-all-btn');

  if (currentUser === 'lorna') {
    if (reqCard) reqCard.style.display = 'none';
    if (approveAllBtn) approveAllBtn.style.display = 'inline-block';
  } else if (currentUser === 'dvalverde') {
    if (reqCard) reqCard.style.display = 'none';
    if (approveAllBtn) approveAllBtn.style.display = 'none';
  } else {
    if (reqCard) reqCard.style.display = 'block';
    if (approveAllBtn) approveAllBtn.style.display = 'none';

    const btn = document.getElementById('req-btn');
    if (btn) {
      btn.style.background = currentUser === 'deiby' ? '#1a56db' : '#057a55';
    }
  }

  const reqDate = document.getElementById('req-date');
  if (reqDate) {
    const minDate = new Date();
    minDate.setHours(0,0,0,0);
    reqDate.min = minDate.toISOString().split('T')[0];
  }

  await loadRequests();
}

// ============================================================
//  SUPABASE — CARGAR SOLICITUDES
// ============================================================
async function loadRequests() {
  if (!sb) {
    requests = [];
    render();
    return;
  }

  try {
    const { data, error } = await sb
      .from('reservas')
      .select('*')
      .order('fecha', { ascending: true });

    if (error) throw error;

    requests = data || [];
  } catch(e) {
    console.error('Error cargando solicitudes:', e);
    showToast('Error conectando con la base de datos');
    requests = [];
  }

  render();
}

// ============================================================
//  SUPABASE — GUARDAR SOLICITUD
// ============================================================
async function submitRequest() {
  if (currentUser === 'lorna' || currentUser === 'dvalverde') return;

  const dateVal = document.getElementById('req-date').value;
  const noteVal = document.getElementById('req-note').value.trim();
  const btn     = document.getElementById('req-btn');

  if (!dateVal) {
    showToast('Seleccioná una fecha');
    return;
  }

  const [y, m, d] = dateVal.split('-').map(Number);
  const dateObj   = new Date(y, m - 1, d);
  const todayFlat = new Date();
  todayFlat.setHours(0,0,0,0);

  if (dateObj < todayFlat) {
    showToast('No podés solicitar días pasados');
    return;
  }

  const u = USERS[currentUser];

  const exists = requests.find(r =>
    r.fecha === dateVal &&
    r.proyecto === u.project &&
    r.estado !== 'rejected'
  );

  if (exists) {
    showToast('Ya tenés una solicitud para ese día');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando…';

  try {
    const { error } = await sb.from('reservas').insert([{
      fecha: dateVal,
      proyecto: u.project,
      usuario: currentUser,
      nombre: u.name,
      nota: noteVal || null,
      estado: 'pending'
    }]);

    if (error) throw error;

    showToast('¡Solicitud enviada! ✓');

    document.getElementById('req-date').value = '';
    document.getElementById('req-note').value = '';

    viewYear  = y;
    viewMonth = m - 1;

    await loadRequests();
  } catch(e) {
    showToast('Error al guardar: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Solicitar día';
  }
}

// ============================================================
//  SUPABASE — ACTUALIZAR ESTADO
// ============================================================
async function updateStatus(id, newStatus) {
  try {
    const { error } = await sb
      .from('reservas')
      .update({ estado: newStatus })
      .eq('id', id);

    if (error) throw error;
  } catch(e) {
    showToast('Error al actualizar: ' + e.message);
    throw e;
  }
}

// ============================================================
//  SUPABASE — EDITAR Y ELIMINAR SOLICITUD
// ============================================================
async function updateRequestDetails(id, newFecha, newNota) {
  try {
    const { data, error } = await sb
      .from('reservas')
      .update({
        fecha: newFecha,
        nota: newNota || null
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || !data.length) {
      showToast('No se actualizó. Revisá permisos de Supabase.');
      return false;
    }

    showToast('Solicitud actualizada ✓');
    await loadRequests();
    return true;
  } catch(e) {
    showToast('Error al editar: ' + e.message);
    throw e;
  }
}

async function deleteRequest(id) {
  try {
    const { data, error } = await sb
      .from('reservas')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || !data.length) {
      showToast('No se eliminó. Revisá permisos/RLS en Supabase.');
      return false;
    }

    showToast('Solicitud eliminada ✓');
    await loadRequests();
    return true;
  } catch(e) {
    showToast('Error al eliminar: ' + e.message);
    throw e;
  }
}

async function editRequestPrompt(id) {
  const r = requests.find(x => String(x.id) === String(id));

  if (!r) {
    showToast('No se encontró la solicitud');
    return;
  }

  if (!canManageRequest(r)) {
    showToast('No tenés permiso para editar esta solicitud');
    return;
  }

  const nuevaFecha = prompt('Nueva fecha en formato YYYY-MM-DD:', r.fecha);

  if (nuevaFecha === null) return;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
    showToast('Formato de fecha inválido. Usá YYYY-MM-DD');
    return;
  }

  const [y, m, d] = nuevaFecha.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);

  if (
    Number.isNaN(dateObj.getTime()) ||
    dateObj.getFullYear() !== y ||
    dateObj.getMonth() !== m - 1 ||
    dateObj.getDate() !== d
  ) {
    showToast('Fecha inválida');
    return;
  }

  const duplicate = requests.find(x =>
    String(x.id) !== String(id) &&
    x.fecha === nuevaFecha &&
    x.proyecto === r.proyecto &&
    x.estado !== 'rejected'
  );

  if (duplicate) {
    showToast('Ya existe una solicitud activa de ese proyecto para esa fecha');
    return;
  }

  const nuevaNota = prompt('Motivo o nota:', r.nota || '');

  if (nuevaNota === null) return;

  const updated = await updateRequestDetails(id, nuevaFecha, nuevaNota.trim());

  if (updated) {
    closeModal();
  }
}

async function deleteRequestConfirm(id) {
  const r = requests.find(x => String(x.id) === String(id));

  if (!r) {
    showToast('No se encontró la solicitud');
    return;
  }

  if (!canManageRequest(r)) {
    showToast('No tenés permiso para eliminar esta solicitud');
    return;
  }

  const ok = confirm('¿Seguro que querés eliminar esta solicitud?');

  if (!ok) return;

  const deleted = await deleteRequest(id);

  if (deleted) {
    closeModal();
  }
}

// ============================================================
//  APROBAR TODAS
// ============================================================
async function approveAll() {
  const toApprove = requests.filter(r =>
    r.estado === 'pending' &&
    getDayRequests(r.fecha).filter(x => x.estado !== 'rejected').length < 2
  );

  if (!toApprove.length) {
    showToast('No hay solicitudes sin conflicto');
    return;
  }

  for (const r of toApprove) {
    await updateStatus(r.id, 'approved');
  }

  showToast(`${toApprove.length} solicitud(es) aprobada(s) ✓`);
  await loadRequests();
}

// ============================================================
//  HELPERS
// ============================================================
function getDayRequests(fecha) {
  return requests.filter(r => r.fecha === fecha);
}

function hasConflict(fecha) {
  return getDayRequests(fecha)
    .filter(r => r.estado !== 'rejected')
    .length > 1;
}

function dateKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function getProjectLabel(project) {
  if (project === 'ccss') return 'CCSS';
  if (project === 'aya') return 'AyA';
  return project;
}

function cortarTexto(texto, limite = 30) {
  if (!texto) return '';
  return texto.length > limite ? texto.substring(0, limite) + '…' : texto;
}

function canManageRequest(r) {
  return (
    currentUser === r.usuario ||
    currentUser === 'dvalverde' ||
    currentUser === 'lorna'
  );
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeJs(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

function render() {
  renderCalendar();
  renderRequests();
  renderStats();
  renderTodayStatus();
}

// ============================================================
//  ESTADO DE HOY
// ============================================================
function renderTodayStatus() {
  const todayEl = document.getElementById('today-location');
  if (!todayEl) return;

  const todayKey = dateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const approvedToday = getDayRequests(todayKey)
    .filter(r => r.estado === 'approved');

  const activeToday = getDayRequests(todayKey)
    .filter(r => r.estado !== 'rejected');

  if (approvedToday.length === 1) {
    const r = approvedToday[0];
    todayEl.className = 'status-indicator status-' + r.proyecto;
    todayEl.textContent = getProjectLabel(r.proyecto);
    return;
  }

  if (approvedToday.length > 1 || activeToday.length > 1) {
    todayEl.className = 'status-indicator status-none';
    todayEl.textContent = '⚠️ Conflicto';
    return;
  }

  if (activeToday.length === 1 && activeToday[0].estado === 'pending') {
    const r = activeToday[0];
    todayEl.className = 'status-indicator status-' + r.proyecto;
    todayEl.textContent = getProjectLabel(r.proyecto) + ' pendiente';
    return;
  }

  todayEl.className = 'status-indicator status-none';
  todayEl.textContent = 'Sin asignación';
}

// ============================================================
//  CALENDARIO
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

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayFlat   = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (let i = 0; i < firstDow; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement('div');
    el.className = 'cal-day';

    const fecha   = dateKey(viewYear, viewMonth, d);
    const dayDate = new Date(viewYear, viewMonth, d);

    if (dayDate.getTime() === todayFlat.getTime()) {
      el.classList.add('today');
    }

    if (dayDate < todayFlat) {
      el.classList.add('past');
    }

    const num = document.createElement('div');
    num.className = 'day-num';
    num.textContent = d;
    el.appendChild(num);

    const dr = getDayRequests(fecha).filter(r => r.estado !== 'rejected');

    if (dr.length === 1) {
      const proyecto = dr[0].proyecto;

      if (proyecto === 'ccss' || proyecto === 'aya') {
        el.classList.add(proyecto + '-day');
      }

      el.setAttribute(
        'data-tooltip',
        `${dr[0].nombre} · ${getProjectLabel(proyecto)} · ${dr[0].estado === 'approved' ? 'Aprobado' : 'Pendiente'}`
      );

      const preview = document.createElement('div');
      preview.className = 'day-preview';

      const name = document.createElement('div');
      name.className = 'day-preview-name';
      name.textContent = dr[0].nombre.split(' ')[0] + ' · ' + getProjectLabel(dr[0].proyecto);

      const note = document.createElement('div');
      note.className = 'day-preview-note';
      note.textContent = dr[0].nota ? cortarTexto(dr[0].nota, 22) : 'Sin motivo';

      preview.appendChild(name);
      preview.appendChild(note);
      el.appendChild(preview);
    }

    if (dr.length > 1) {
      el.classList.add('conflict-day');
      el.setAttribute('data-tooltip', '⚠️ Conflicto: varias solicitudes este día');

      const preview = document.createElement('div');
      preview.className = 'day-preview';

      dr.slice(0, 2).forEach(r => {
        const name = document.createElement('div');
        name.className = 'day-preview-name';
        name.textContent = r.nombre.split(' ')[0] + ' · ' + getProjectLabel(r.proyecto);
        preview.appendChild(name);
      });

      if (dr.length > 2) {
        const more = document.createElement('div');
        more.className = 'day-preview-note';
        more.textContent = '+' + (dr.length - 2) + ' más';
        preview.appendChild(more);
      }

      el.appendChild(preview);
    }

    if (dr.length) {
      const dots = document.createElement('div');
      dots.className = 'dots';

      if (hasConflict(fecha)) {
        const dot = document.createElement('div');
        dot.className = 'dot dot-conflict';
        dots.appendChild(dot);
      } else {
        dr.forEach(r => {
          const dot = document.createElement('div');
          dot.className = 'dot dot-' + r.proyecto;
          dots.appendChild(dot);
        });
      }

      el.appendChild(dots);
    }

    el.addEventListener('click', () => openDayModal(fecha));
    grid.appendChild(el);
  }
}

// ============================================================
//  MODAL DE DÍA
// ============================================================
function openDayModal(fecha) {
  const dr = getDayRequests(fecha);
  const [y, m, d] = fecha.split('-').map(Number);

  document.getElementById('modal-title').textContent =
    '📅 ' + d + ' de ' + MONTHS[m-1] + ' de ' + y;

  let body = '';

  if (hasConflict(fecha)) {
    body += `
      <div class="conflict-alert">
        ⚠️ Conflicto: dos proyectos solicitan este día. Lorna debe elegir quién va.
      </div>
    `;
  }

  if (!dr.length) {
    body = `
      <div style="color:#9ca3af;font-size:13px">
        Sin solicitudes para este día.
      </div>
    `;
  } else {
    dr.forEach(r => {
      const estado =
        r.estado === 'pending'
          ? '<span class="badge badge-pending">Pendiente</span>'
          : r.estado === 'approved'
            ? '<span class="badge badge-approved">Aprobado</span>'
            : '<span class="badge badge-rejected">Rechazado</span>';

      const puedeGestionar = canManageRequest(r);
      const safeId = escapeJs(r.id);

      body += `
        <div class="modal-req ${escapeHtml(r.proyecto)}">
          <div style="font-weight:600;color:#1f2937">
            ${escapeHtml(r.nombre)} ${estado}
          </div>

          <div style="font-size:12px;color:#9ca3af;margin-top:2px">
            ${escapeHtml(getProjectLabel(r.proyecto))}
          </div>

          ${
            r.nota
              ? `<div style="font-size:12px;color:#4b5563;margin-top:4px;font-style:italic">"${escapeHtml(r.nota)}"</div>`
              : `<div style="font-size:12px;color:#9ca3af;margin-top:4px;font-style:italic">Sin motivo indicado</div>`
          }

          ${
            puedeGestionar
              ? `
                <div class="modal-actions-row">
                  <button type="button" class="btn-edit" onclick="editRequestPrompt('${safeId}')">
                    ✏️ Editar
                  </button>
                  <button type="button" class="btn-delete" onclick="deleteRequestConfirm('${safeId}')">
                    🗑️ Eliminar
                  </button>
                </div>
                <div class="edit-help-text">
                  Podés editar fecha o motivo si hubo un error.
                </div>
              `
              : ''
          }
        </div>
      `;
    });
  }

  document.getElementById('modal-body').innerHTML = body;

  const footer = document.getElementById('modal-footer');
  footer.innerHTML = '';

  if (currentUser === 'lorna' && dr.length) {
    if (hasConflict(fecha)) {
      dr.filter(r => r.estado !== 'rejected').forEach(r => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-approve';
        btn.style.fontSize = '12px';
        btn.textContent = '✅ Aprobar ' + r.nombre.split(' ')[0];

        btn.onclick = async () => {
          await updateStatus(r.id, 'approved');

          for (const o of dr.filter(x => x.id !== r.id)) {
            await updateStatus(o.id, 'rejected');
          }

          showToast('Día asignado a ' + r.nombre.split(' ')[0]);
          await loadRequests();
          closeModal();
        };

        footer.appendChild(btn);
      });
    } else {
      const pending = dr.filter(r => r.estado === 'pending');

      if (pending.length) {
        const ab = document.createElement('button');
        ab.type = 'button';
        ab.className = 'btn-approve';
        ab.textContent = '✅ Aprobar';

        ab.onclick = async () => {
          for (const r of pending) {
            await updateStatus(r.id, 'approved');
          }

          showToast('Día aprobado ✓');
          await loadRequests();
          closeModal();
        };

        footer.appendChild(ab);

        const rb = document.createElement('button');
        rb.type = 'button';
        rb.className = 'btn-reject';
        rb.textContent = '❌ Rechazar';

        rb.onclick = async () => {
          for (const r of pending) {
            await updateStatus(r.id, 'rejected');
          }

          showToast('Día rechazado');
          await loadRequests();
          closeModal();
        };

        footer.appendChild(rb);
      }
    }
  }

  const cb = document.createElement('button');
  cb.type = 'button';
  cb.className = 'btn-secondary';
  cb.textContent = 'Cerrar';
  cb.onclick = () => closeModal();

  footer.appendChild(cb);

  document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
  const modal = document.getElementById('modal');

  if (!modal) return;

  if (e && e.target !== modal) return;

  modal.classList.remove('open');
}

// ============================================================
//  LISTA Y STATS
// ============================================================
function renderRequests() {
  const list = document.getElementById('req-list');

  const sorted = [...requests].sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (!sorted.length) {
    list.innerHTML = '<div class="empty-state">Sin solicitudes aún</div>';
    return;
  }

  list.innerHTML = sorted.map(r => {
    const conflict  = hasConflict(r.fecha);
    const cls       = conflict ? 'conflict' : r.proyecto;
    const [y, m, d] = r.fecha.split('-').map(Number);

    const badge =
      r.estado === 'pending'
        ? 'badge-pending'
        : r.estado === 'approved'
          ? 'badge-approved'
          : 'badge-rejected';

    const badgeTxt =
      r.estado === 'pending'
        ? 'Pendiente'
        : r.estado === 'approved'
          ? 'Aprobado'
          : 'Rechazado';

    return `
      <div class="req-item ${escapeHtml(cls)} ${r.estado === 'rejected' ? 'rejected' : ''}">
        <div class="req-date">
          ${d} ${MONTHS[m-1]} ${y}
          <span class="badge ${badge}">${badgeTxt}</span>
        </div>
        <div class="req-meta">
          ${escapeHtml(r.nombre)} · ${escapeHtml(getProjectLabel(r.proyecto))}${conflict ? ' ⚠️' : ''}
        </div>
        ${
          r.nota
            ? `<div class="req-note">"${escapeHtml(r.nota)}"</div>`
            : ''
        }
      </div>
    `;
  }).join('');
}

function renderStats() {
  const monthKey = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;

  const ccssCount = requests.filter(r =>
    r.proyecto === 'ccss' &&
    r.fecha.startsWith(monthKey) &&
    r.estado !== 'rejected'
  ).length;

  const ayaCount = requests.filter(r =>
    r.proyecto === 'aya' &&
    r.fecha.startsWith(monthKey) &&
    r.estado !== 'rejected'
  ).length;

  const pend = requests.filter(r =>
    r.estado === 'pending'
  ).length;

  const days = new Set(
    requests
      .filter(r => r.fecha.startsWith(monthKey))
      .map(r => r.fecha)
  );

  let conf = 0;

  days.forEach(f => {
    if (hasConflict(f)) conf++;
  });

  document.getElementById('stat-ccss').textContent = ccssCount;
  document.getElementById('stat-aya').textContent  = ayaCount;
  document.getElementById('stat-pend').textContent = pend;
  document.getElementById('stat-conf').textContent = conf;
}

// ============================================================
//  HELPERS UI
// ============================================================
function showToast(msg) {
  const t = document.getElementById('toast');

  t.textContent = msg;
  t.classList.add('show');

  setTimeout(() => {
    t.classList.remove('show');
  }, 2600);
}

function changeMonth(delta) {
  viewMonth += delta;

  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }

  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }

  renderCalendar();
  renderStats();
  renderTodayStatus();
}

// ============================================================
//  EVENTOS DE LOGIN
// ============================================================
const loginPassInput = document.getElementById('login-pass');
const loginUserInput = document.getElementById('login-user');

if (loginPassInput)
