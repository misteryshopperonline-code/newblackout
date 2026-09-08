const app = document.querySelector('#app');
const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let leads = [];
let selectedLeadId = null;
let notifications = [];
let notifPanelOpen = false;
let pollTimer = null;
const leadSnapshot = new Map();
const POLL_INTERVAL_MS = 25000;
const EVIDENCE_CATEGORIES = [
  { key: 'cotizacion_original', label: 'Cotización original' },
  { key: 'factura_servicio', label: 'Factura del servicio realizado' },
  { key: 'factura_pago', label: 'Factura / comprobante de pago' }
];
const MAX_EVIDENCE_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = value ?? '';
  return node.innerHTML;
}

function normalizeEcuadorMobile(value) {
  return value.replace(/[\s-]/g, '');
}

function hasRequiredEvidence(lead) {
  const files = Array.isArray(lead.files) ? lead.files : [];
  return EVIDENCE_CATEGORIES.every((category) => files.some((file) => file.category === category.key));
}

function formatFileSize(bytes) {
  if (typeof bytes !== 'number') return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('No pudimos leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function evidenceFileHtml(file) {
  return `<div class="evidence-file"><a href="/.netlify/functions/crm-lead-files?key=${encodeURIComponent(file.key)}" target="_blank" rel="noopener">${escapeHtml(file.name)}</a><span>${formatFileSize(file.size)} · ${new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(file.uploadedAt))}</span><button type="button" class="evidence-delete" data-file-id="${file.id}" aria-label="Eliminar ${escapeHtml(file.name)}">✕</button></div>`;
}

function evidenceSectionHtml(lead) {
  const files = Array.isArray(lead.files) ? lead.files : [];
  const requiredRows = EVIDENCE_CATEGORIES.map((category) => {
    const existing = files.filter((file) => file.category === category.key);
    return `<div class="evidence-row"><div class="evidence-label"><span>${category.label}</span>${existing.length ? '<span class="evidence-check">✓ Adjunto</span>' : '<span class="evidence-missing">Pendiente</span>'}</div><div class="evidence-files">${existing.map(evidenceFileHtml).join('')}</div><label class="evidence-upload">Subir archivo<input type="file" accept=".pdf,image/*" data-category="${category.key}" hidden /></label></div>`;
  }).join('');
  const otherFiles = files.filter((file) => file.category === 'otro');
  return `<section class="detail-block evidence-block"><h3>Evidencia de conversión</h3><p class="evidence-hint">Obligatorios para marcar el prospecto como Ganado.</p>${requiredRows}<div class="evidence-row"><div class="evidence-label"><span>Otros documentos</span></div><div class="evidence-files">${otherFiles.map(evidenceFileHtml).join('') || '<span class="evidence-empty">Sin adjuntos</span>'}</div><label class="evidence-upload">Adjuntar<input type="file" accept=".pdf,image/*" data-category="otro" hidden /></label></div><p class="detail-error" id="evidence-error" aria-live="polite"></p></section>`;
}

function replaceLead(updatedLead) {
  leads = leads.map((lead) => lead.id === updatedLead.id ? updatedLead : lead);
}

function removeLead(id) {
  leads = leads.filter((lead) => lead.id !== id);
}

function buildSnapshotEntry(lead) {
  return { status: lead.status, notesCount: Array.isArray(lead.notes) ? lead.notes.length : 0 };
}

const PIPELINE_STAGES = ['Nuevo', 'Contactado', 'Visita técnica', 'Propuesta enviada', 'Ganado'];

function formatLeadTimestamp(iso) {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat('es-EC', { timeStyle: 'short' }).format(date);
  if (new Date().toDateString() === date.toDateString()) return `hoy, ${time}`;
  return `${new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short' }).format(date)}, ${time}`;
}

function statusPipelineHtml(lead) {
  if (lead.status === 'Perdido') {
    return `<div class="status-pipeline is-lost" aria-label="Estado de ${escapeHtml(lead.name)}"><p class="lost-banner">Prospecto marcado como <strong>perdido</strong></p><button type="button" class="reopen-lead" data-status="Contactado">Reactivar prospecto</button></div>`;
  }
  const currentIndex = PIPELINE_STAGES.indexOf(lead.status);
  const steps = PIPELINE_STAGES.map((stage, index) => {
    const state = index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : 'is-upcoming';
    return `<li class="step ${state}"><button type="button" data-status="${stage}" aria-current="${index === currentIndex ? 'step' : 'false'}"><span class="step-index">${index < currentIndex ? '✓' : index + 1}</span><span class="step-label">${stage}</span></button></li>`;
  }).join('');
  return `<div class="status-pipeline" role="group" aria-label="Estado de ${escapeHtml(lead.name)}"><ol class="pipeline-steps">${steps}</ol><button type="button" class="mark-lost" data-status="Perdido">Marcar como perdido</button></div>`;
}

function syncSnapshot(list) {
  list.forEach((lead) => leadSnapshot.set(lead.id, buildSnapshotEntry(lead)));
}

function addNotification(type, lead, message) {
  notifications = [{ id: crypto.randomUUID(), type, leadId: lead.id, message, createdAt: new Date().toISOString(), leadRegisteredAt: lead.createdAt, read: false }, ...notifications].slice(0, 50);
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {}
}

function requestNotifPermission() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
  Notification.requestPermission();
}

function notifyExternally(freshNotifications) {
  playChime();
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
    freshNotifications.slice(0, 3).forEach((notification) => new Notification('Blackout CRM', { body: notification.message }));
  }
}

function renderNotifPanel() {
  const badge = document.querySelector('#notif-badge');
  const list = document.querySelector('#notif-list');
  const panel = document.querySelector('#notif-panel');
  const bell = document.querySelector('#notif-bell');
  const markAll = document.querySelector('#notif-mark-all');
  if (!badge || !list || !panel || !bell || !markAll) return;
  const unread = notifications.filter((notification) => !notification.read).length;
  badge.textContent = String(unread);
  badge.hidden = unread === 0;
  list.innerHTML = notifications.length ? notifications.map((notification) => `<button type="button" class="notif-item${notification.read ? '' : ' is-unread'}" data-notif-id="${notification.id}" data-lead-id="${escapeHtml(notification.leadId)}"><span class="notif-message">${escapeHtml(notification.message)}</span><time class="notif-registered" datetime="${notification.leadRegisteredAt}">Registrado ${formatLeadTimestamp(notification.leadRegisteredAt)}</time></button>`).join('') : '<p class="notif-empty">Sin notificaciones por ahora.</p>';
  panel.hidden = !notifPanelOpen;
  bell.setAttribute('aria-expanded', String(notifPanelOpen));
  list.querySelectorAll('[data-notif-id]').forEach((button) => button.addEventListener('click', () => {
    const notification = notifications.find((item) => item.id === button.dataset.notifId);
    if (notification) notification.read = true;
    selectedLeadId = button.dataset.leadId;
    notifPanelOpen = false;
    renderDashboard();
  }));
  bell.onclick = () => {
    notifPanelOpen = !notifPanelOpen;
    if (notifPanelOpen) requestNotifPermission();
    renderNotifPanel();
  };
  markAll.onclick = () => {
    notifications.forEach((notification) => { notification.read = true; });
    renderNotifPanel();
  };
}

function renderLeadList() {
  const list = document.querySelector('#lead-list');
  if (!list) return;
  document.querySelector('#lead-count').textContent = `${leads.length} ${leads.length === 1 ? 'prospecto' : 'prospectos'}`;
  list.innerHTML = leads.length ? leads.map((lead) => `<button class="lead-row${lead.id === selectedLeadId ? ' is-selected' : ''}" type="button" data-id="${lead.id}"><span><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.email)}</span><span class="status" data-status="${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span>${lead.duplicateMatches?.length ? `<span class="duplicate-badge">Duplicado · ${lead.duplicateMatches.length + 1} registros</span>` : ''}</span><time datetime="${lead.createdAt}">${new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(lead.createdAt))}</time></button>`).join('') : '<p class="empty-state">Todavía no hay solicitudes del cotizador.</p>';
  list.querySelectorAll('.lead-row').forEach((button) => button.addEventListener('click', () => { selectedLeadId = button.dataset.id; renderDashboard(); }));
}

async function pollLeads() {
  try {
    const freshLeads = (await request('/.netlify/functions/crm-leads')).leads;
    let freshCount = 0;
    freshLeads.forEach((lead) => {
      const previous = leadSnapshot.get(lead.id);
      const notesCount = Array.isArray(lead.notes) ? lead.notes.length : 0;
      if (!previous) {
        addNotification('new-lead', lead, `Nuevo prospecto: ${lead.name}`);
        freshCount += 1;
      } else {
        if (previous.status !== lead.status) { addNotification('status', lead, `${lead.name} pasó a "${lead.status}"`); freshCount += 1; }
        if (notesCount > previous.notesCount) { addNotification('note', lead, `Nueva nota de seguimiento en ${lead.name}`); freshCount += 1; }
      }
    });
    leads = freshLeads;
    syncSnapshot(freshLeads);
    renderLeadList();
    if (freshCount) {
      renderNotifPanel();
      notifyExternally(notifications.slice(0, freshCount));
    }
  } catch {
    /* silent: keep polling on transient network errors */
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(pollLeads, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  notifications = [];
  leadSnapshot.clear();
}

document.addEventListener('click', (event) => {
  if (notifPanelOpen && !event.target.closest('.notif-wrap')) { notifPanelOpen = false; renderNotifPanel(); }
});

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No pudimos procesar la solicitud.');
  return data;
}

function renderDetail() {
  const detail = document.querySelector('#lead-detail');
  const lead = leads.find((item) => item.id === selectedLeadId);
  if (!lead) { detail.innerHTML = '<p>Selecciona un prospecto para ver su cotización.</p>'; return; }
  const quote = lead.quote;
  const phone = typeof lead.phone === 'string' ? lead.phone : '';
  const notes = Array.isArray(lead.notes) ? lead.notes : [];
  const duplicateMatches = Array.isArray(lead.duplicateMatches) ? lead.duplicateMatches : [];
  const duplicateNotice = duplicateMatches.length ? `<section class="duplicate-alert"><strong>Posible registro duplicado</strong><p>Encontramos ${duplicateMatches.length} ${duplicateMatches.length === 1 ? 'registro relacionado' : 'registros relacionados'} por correo o celular.</p><ul>${duplicateMatches.map((match) => `<li><button type="button" class="duplicate-link" data-duplicate-id="${escapeHtml(match.id)}"><strong>${escapeHtml(match.name)}</strong><span>${escapeHtml(match.email)} · ${new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(match.createdAt))}</span></button></li>`).join('')}</ul></section>` : '';
  detail.innerHTML = `<div class="detail-header"><div><h2>${escapeHtml(lead.name)}</h2><p>${escapeHtml(lead.email)} · ${escapeHtml(lead.location)}${lead.quoteNumber ? ` · Cotizaci\u00f3n <strong>${escapeHtml(lead.quoteNumber)}</strong>` : ''}</p></div></div>${statusPipelineHtml(lead)}${duplicateNotice}${evidenceSectionHtml(lead)}<section class="detail-block"><h3>Contacto</h3><form class="contact-form" id="lead-phone-form"><label for="lead-phone">Celular ecuatoriano</label><div><input id="lead-phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" pattern="09[0-9]{8}" value="${escapeHtml(phone)}" placeholder="0992933619" /><button type="submit">Guardar</button></div><p class="detail-error" id="phone-error" aria-live="polite"></p></form></section><section class="detail-block"><h3>Valor referencial</h3><div class="quote-total">${currency.format(quote.low)} - ${currency.format(quote.high)}<span>${number.format(quote.area)} m2 aproximados</span></div></section><section class="detail-block"><h3>Ambientes cotizados</h3><table class="window-table"><thead><tr><th>Ambiente</th><th>Solución</th><th>Medida</th></tr></thead><tbody>${lead.windows.map((window) => `<tr><td>${escapeHtml(window.room)}</td><td>${escapeHtml(window.productLabel)}</td><td>${number.format(window.width)} x ${number.format(window.height)} m</td></tr>`).join('')}</tbody></table></section><section class="detail-block"><h3>Necesidades</h3><p>${lead.needs.length ? lead.needs.map(escapeHtml).join(', ') : 'Necesita recomendación'}</p></section><section class="detail-block notes-block"><h3>Notas de seguimiento</h3><div class="notes-list">${notes.length ? notes.map((note) => `<article class="note"><p>${escapeHtml(note.text)}</p><small>${escapeHtml(note.author || 'Asesor')} · ${new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.createdAt))}</small></article>`).join('') : '<p class="empty-notes">Aún no hay notas de seguimiento.</p>'}</div><form class="note-form" id="lead-note-form"><label for="lead-note">Nueva nota</label><textarea id="lead-note" maxlength="2000" required placeholder="Registra el contacto, acuerdos o próximos pasos."></textarea><div><p class="detail-error" id="note-error" aria-live="polite"></p><button type="submit">Agregar nota</button></div></form></section><section class="detail-block danger-zone"><button class="delete-lead" id="delete-lead" type="button">Eliminar prospecto</button><p class="detail-error" id="delete-error" aria-live="polite"></p></section>`;
  detail.querySelectorAll('[data-duplicate-id]').forEach((button) => button.addEventListener('click', () => { selectedLeadId = button.dataset.duplicateId; renderDashboard(); }));
  detail.querySelectorAll('.status-pipeline [data-status]').forEach((button) => button.addEventListener('click', async () => {
    const newStatus = button.dataset.status;
    if (newStatus === lead.status) return;
    if (newStatus === 'Ganado' && !hasRequiredEvidence(lead)) {
      const evidenceError = document.querySelector('#evidence-error');
      if (evidenceError) evidenceError.textContent = 'Adjunta la cotización original, la factura del servicio realizado y el comprobante de pago antes de marcar como Ganado.';
      document.querySelector('.evidence-block')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const pipeline = button.closest('.status-pipeline');
    pipeline.querySelectorAll('button').forEach((item) => { item.disabled = true; });
    try {
      replaceLead((await request('/.netlify/functions/crm-leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id, status: newStatus }) })).lead);
      renderDashboard();
    } catch (error) {
      alert(error.message);
      pipeline.querySelectorAll('button').forEach((item) => { item.disabled = false; });
    }
  }));
  detail.querySelectorAll('.evidence-upload input[type=file]').forEach((input) => input.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const category = event.target.dataset.category;
    const evidenceError = document.querySelector('#evidence-error');
    evidenceError.textContent = '';
    if (file.size > MAX_EVIDENCE_FILE_BYTES) { evidenceError.textContent = 'El archivo debe pesar menos de 8MB.'; event.target.value = ''; return; }
    if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) { evidenceError.textContent = 'Solo se aceptan PDF o imágenes (PNG, JPG, WEBP).'; event.target.value = ''; return; }
    const label = event.target.closest('.evidence-upload');
    label.setAttribute('aria-busy', 'true');
    try {
      const dataBase64 = await readFileAsBase64(file);
      replaceLead((await request('/.netlify/functions/crm-lead-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: lead.id, category, fileName: file.name, contentType: file.type, dataBase64 }) })).lead);
      renderDetail();
    } catch (requestError) {
      evidenceError.textContent = requestError.message;
      label.removeAttribute('aria-busy');
    }
  }));
  detail.querySelectorAll('.evidence-delete').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('¿Eliminar este archivo adjunto?')) return;
    const evidenceError = document.querySelector('#evidence-error');
    button.disabled = true;
    try {
      replaceLead((await request('/.netlify/functions/crm-lead-files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: lead.id, fileId: button.dataset.fileId }) })).lead);
      renderDetail();
    } catch (requestError) {
      evidenceError.textContent = requestError.message;
      button.disabled = false;
    }
  }));
  document.querySelector('#lead-phone-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.querySelector('#lead-phone');
    const error = document.querySelector('#phone-error');
    const updatedPhone = normalizeEcuadorMobile(input.value);
    if (!/^09\d{8}$/.test(updatedPhone)) { input.setAttribute('aria-invalid', 'true'); error.textContent = 'Ingresa un celular ecuatoriano de 10 dígitos, por ejemplo 0992933619.'; input.focus(); return; }
    const button = event.submitter;
    button.disabled = true;
    error.textContent = '';
    try { replaceLead((await request('/.netlify/functions/crm-leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id, phone: updatedPhone }) })).lead); renderDetail(); } catch (requestError) { error.textContent = requestError.message; } finally { button.disabled = false; }
  });
  document.querySelector('#lead-note-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.querySelector('#lead-note');
    const error = document.querySelector('#note-error');
    const note = input.value.trim();
    if (!note) { error.textContent = 'Escribe una nota antes de guardarla.'; input.focus(); return; }
    const button = event.submitter;
    button.disabled = true;
    error.textContent = '';
    try { replaceLead((await request('/.netlify/functions/crm-leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id, note }) })).lead); renderDetail(); } catch (requestError) { error.textContent = requestError.message; } finally { button.disabled = false; }
  });
  document.querySelector('#delete-lead').addEventListener('click', async (event) => {
    if (!window.confirm(`¿Eliminar permanentemente el prospecto ${lead.name}? Esta acción no se puede deshacer.`)) return;
    const button = event.currentTarget;
    const error = document.querySelector('#delete-error');
    button.disabled = true;
    error.textContent = '';
    try {
      await request('/.netlify/functions/crm-leads', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id }) });
      removeLead(lead.id);
      selectedLeadId = leads[0]?.id || null;
      renderDashboard();
    } catch (requestError) {
      error.textContent = requestError.message;
      button.disabled = false;
    }
  });
}

function renderDashboard() {
  app.replaceChildren(document.querySelector('#crm-view').content.cloneNode(true));
  document.querySelector('#active-user').textContent = window.crmUser;
  renderLeadList();
  renderNotifPanel();
  document.querySelector('#logout').addEventListener('click', async () => { await request('/.netlify/functions/crm-auth', { method: 'DELETE' }); stopPolling(); renderLogin(); });
  renderDetail();
}

function renderLogin(message = '') {
  app.replaceChildren(document.querySelector('#login-view').content.cloneNode(true));
  document.querySelector('#login-error').textContent = message;
  document.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const error = document.querySelector('#login-error');
    try { const session = await request('/.netlify/functions/crm-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) }); window.crmUser = session.user; await loadDashboard(); } catch (requestError) { error.textContent = requestError.message; }
  });
}

async function loadDashboard() {
  try {
    leads = (await request('/.netlify/functions/crm-leads')).leads;
    selectedLeadId = leads[0]?.id || null;
    syncSnapshot(leads);
    renderDashboard();
    startPolling();
  } catch (error) { renderLogin(error.message); }
}

(async () => { try { const session = await request('/.netlify/functions/crm-auth'); if (!session.authenticated) return renderLogin(); window.crmUser = session.user; await loadDashboard(); } catch { renderLogin(); } })();