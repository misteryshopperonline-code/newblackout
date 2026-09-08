const app = document.querySelector('#app');
const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let leads = [];
let selectedLeadId = null;

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = value ?? '';
  return node.innerHTML;
}

function normalizeEcuadorMobile(value) {
  return value.replace(/[\s-]/g, '');
}

function replaceLead(updatedLead) {
  leads = leads.map((lead) => lead.id === updatedLead.id ? updatedLead : lead);
}

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
  detail.innerHTML = `<div class="detail-header"><div><h2>${escapeHtml(lead.name)}</h2><p>${escapeHtml(lead.email)} · ${escapeHtml(lead.location)}</p></div><select id="lead-status" aria-label="Estado de ${escapeHtml(lead.name)}">${['Nuevo','Contactado','Visita técnica','Propuesta enviada','Ganado','Perdido'].map((status) => `<option${status === lead.status ? ' selected' : ''}>${status}</option>`).join('')}</select></div><section class="detail-block"><h3>Contacto</h3><form class="contact-form" id="lead-phone-form"><label for="lead-phone">Celular ecuatoriano</label><div><input id="lead-phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" pattern="09[0-9]{8}" value="${escapeHtml(phone)}" placeholder="0992933619" /><button type="submit">Guardar</button></div><p class="detail-error" id="phone-error" aria-live="polite"></p></form></section><section class="detail-block"><h3>Valor referencial</h3><div class="quote-total">${currency.format(quote.low)} - ${currency.format(quote.high)}<span>${number.format(quote.area)} m2 aproximados</span></div></section><section class="detail-block"><h3>Ambientes cotizados</h3><table class="window-table"><thead><tr><th>Ambiente</th><th>Solución</th><th>Medida</th></tr></thead><tbody>${lead.windows.map((window) => `<tr><td>${escapeHtml(window.room)}</td><td>${escapeHtml(window.productLabel)}</td><td>${number.format(window.width)} x ${number.format(window.height)} m</td></tr>`).join('')}</tbody></table></section><section class="detail-block"><h3>Necesidades</h3><p>${lead.needs.length ? lead.needs.map(escapeHtml).join(', ') : 'Necesita recomendación'}</p></section><section class="detail-block notes-block"><h3>Notas de seguimiento</h3><div class="notes-list">${notes.length ? notes.map((note) => `<article class="note"><p>${escapeHtml(note.text)}</p><small>${escapeHtml(note.author || 'Asesor')} · ${new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.createdAt))}</small></article>`).join('') : '<p class="empty-notes">Aún no hay notas de seguimiento.</p>'}</div><form class="note-form" id="lead-note-form"><label for="lead-note">Nueva nota</label><textarea id="lead-note" maxlength="2000" required placeholder="Registra el contacto, acuerdos o próximos pasos."></textarea><div><p class="detail-error" id="note-error" aria-live="polite"></p><button type="submit">Agregar nota</button></div></form></section>`;
  document.querySelector('#lead-status').addEventListener('change', async (event) => {
    event.target.disabled = true;
    try { replaceLead((await request('/.netlify/functions/crm-leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id, status: event.target.value }) })).lead); renderDashboard(); } catch (error) { event.target.value = lead.status; alert(error.message); } finally { event.target.disabled = false; }
  });
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
}

function renderDashboard() {
  app.replaceChildren(document.querySelector('#crm-view').content.cloneNode(true));
  document.querySelector('#active-user').textContent = window.crmUser;
  document.querySelector('#lead-count').textContent = `${leads.length} ${leads.length === 1 ? 'prospecto' : 'prospectos'}`;
  const list = document.querySelector('#lead-list');
  list.innerHTML = leads.length ? leads.map((lead) => `<button class="lead-row${lead.id === selectedLeadId ? ' is-selected' : ''}" type="button" data-id="${lead.id}"><span><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.email)}</span><span class="status" data-status="${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span></span><time datetime="${lead.createdAt}">${new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(lead.createdAt))}</time></button>`).join('') : '<p class="empty-state">Todavía no hay solicitudes del cotizador.</p>';
  list.querySelectorAll('.lead-row').forEach((button) => button.addEventListener('click', () => { selectedLeadId = button.dataset.id; renderDashboard(); }));
  document.querySelector('#logout').addEventListener('click', async () => { await request('/.netlify/functions/crm-auth', { method: 'DELETE' }); renderLogin(); });
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
  try { leads = (await request('/.netlify/functions/crm-leads')).leads; selectedLeadId = leads[0]?.id || null; renderDashboard(); } catch (error) { renderLogin(error.message); }
}

(async () => { try { const session = await request('/.netlify/functions/crm-auth'); if (!session.authenticated) return renderLogin(); window.crmUser = session.user; await loadDashboard(); } catch { renderLogin(); } })();