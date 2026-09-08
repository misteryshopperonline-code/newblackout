const { connectLambda, getStore } = require('@netlify/blobs');
const { requireSession } = require('./crm-auth');

const ALLOWED_STATUSES = ['Nuevo', 'Contactado', 'Visita técnica', 'Propuesta enviada', 'Ganado', 'Perdido'];
const ECUADOR_MOBILE_PATTERN = /^09\d{8}$/;
const MAX_NOTE_LENGTH = 2000;

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

function configureBlobs(event) {
  if (event?.blobs) connectLambda(event);
}

async function getLeads() {
  return (await getStore('prospects').get('leads', { type: 'json' })) || [];
}

function normalizeEcuadorMobile(value) {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
}

exports.saveLead = async (event, lead) => {
  configureBlobs(event);
  const store = getStore('prospects');
  const leads = await getLeads();
  await store.setJSON('leads', [lead, ...leads].slice(0, 500));
};

exports.handler = async (event) => {
  const session = requireSession(event);
  if (!session) return response(401, { error: 'Unauthorized.' });
  try {
    configureBlobs(event);
    if (event.httpMethod === 'GET') return response(200, { leads: await getLeads() });
    if (event.httpMethod !== 'PATCH') return response(405, { error: 'Method not allowed.' });
    let request;
    try {
      request = JSON.parse(event.body || '{}');
    } catch {
      return response(400, { error: 'Invalid request body.' });
    }
    if (typeof request.id !== 'string') return response(400, { error: 'Invalid update.' });
    const hasStatus = Object.hasOwn(request, 'status');
    const hasPhone = Object.hasOwn(request, 'phone');
    const hasNote = Object.hasOwn(request, 'note');
    if (!hasStatus && !hasPhone && !hasNote) return response(400, { error: 'Invalid update.' });
    if (hasStatus && !ALLOWED_STATUSES.includes(request.status)) return response(400, { error: 'Invalid status.' });
    const phone = hasPhone ? normalizeEcuadorMobile(request.phone) : null;
    if (hasPhone && !ECUADOR_MOBILE_PATTERN.test(phone)) return response(400, { error: 'Invalid Ecuador mobile number.' });
    const note = hasNote && typeof request.note === 'string' ? request.note.trim() : '';
    if (hasNote && (!note || note.length > MAX_NOTE_LENGTH)) return response(400, { error: 'Invalid note.' });
    const store = getStore('prospects');
    const leads = await getLeads();
    let updatedLead;
    const updated = leads.map((lead) => {
      if (lead.id !== request.id) return lead;
      const updatedAt = new Date().toISOString();
      const notes = Array.isArray(lead.notes) ? lead.notes : [];
      updatedLead = {
        ...lead,
        ...(hasStatus ? { status: request.status } : {}),
        ...(hasPhone ? { phone } : {}),
        ...(hasNote ? { notes: [...notes, { id: crypto.randomUUID(), text: note, author: session.username, createdAt: updatedAt }] } : {}),
        updatedAt
      };
      return updatedLead;
    });
    if (!updatedLead) return response(404, { error: 'Lead not found.' });
    await store.setJSON('leads', updated);
    return response(200, { lead: updatedLead });
  } catch (error) {
    console.error('Unable to access the prospects store:', error);
    return response(503, { error: 'El CRM no puede acceder a los prospectos. Revisa Netlify Blobs y vuelve a intentarlo.' });
  }
};