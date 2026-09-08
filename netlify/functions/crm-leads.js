const { getStore } = require('@netlify/blobs');
const { requireSession } = require('./crm-auth');

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

async function getLeads() {
  return (await getStore('prospects').get('leads', { type: 'json' })) || [];
}

exports.saveLead = async (lead) => {
  const store = getStore('prospects');
  const leads = await getLeads();
  await store.setJSON('leads', [lead, ...leads].slice(0, 500));
};

exports.handler = async (event) => {
  if (!requireSession(event)) return response(401, { error: 'Unauthorized.' });
  try {
    if (event.httpMethod === 'GET') return response(200, { leads: await getLeads() });
    if (event.httpMethod !== 'PATCH') return response(405, { error: 'Method not allowed.' });
    let request;
    try {
      request = JSON.parse(event.body || '{}');
    } catch {
      return response(400, { error: 'Invalid request body.' });
    }
    const allowedStatuses = ['Nuevo', 'Contactado', 'Visita técnica', 'Propuesta enviada', 'Ganado', 'Perdido'];
    if (typeof request.id !== 'string' || !allowedStatuses.includes(request.status)) return response(400, { error: 'Invalid update.' });
    const store = getStore('prospects');
    const leads = await getLeads();
    const updated = leads.map((lead) => lead.id === request.id ? { ...lead, status: request.status, updatedAt: new Date().toISOString() } : lead);
    if (updated.every((lead) => lead.id !== request.id)) return response(404, { error: 'Lead not found.' });
    await store.setJSON('leads', updated);
    return response(200, { success: true });
  } catch (error) {
    console.error('Unable to access the prospects store:', error);
    return response(503, { error: 'El CRM no puede acceder a los prospectos. Revisa Netlify Blobs y vuelve a intentarlo.' });
  }
};