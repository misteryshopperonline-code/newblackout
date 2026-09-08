const crypto = require('node:crypto');
const { connectLambda, getStore } = require('@netlify/blobs');
const { requireSession } = require('./crm-auth');
const { getDuplicateMatches } = require('./crm-leads');

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_CATEGORIES = ['cotizacion_original', 'factura_servicio', 'factura_pago', 'otro'];
const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }, body: JSON.stringify(body) };
}

function configureBlobs(event) {
  if (event?.blobs) connectLambda(event);
}

async function getLeads() {
  return (await getStore('prospects').get('leads', { type: 'json' })) || [];
}

async function saveLeads(leads) {
  await getStore('prospects').setJSON('leads', leads);
}

function sanitizeFileName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return trimmed.slice(0, 140).replace(/[^\w.\- ]+/g, '_') || 'documento';
}

exports.handler = async (event) => {
  const session = requireSession(event);
  if (!session) return response(401, { error: 'Unauthorized.' });
  try {
    configureBlobs(event);
    const filesStore = getStore('lead-files');

    if (event.httpMethod === 'GET') {
      const key = event.queryStringParameters?.key;
      if (typeof key !== 'string' || !key) return response(400, { error: 'Falta el identificador del archivo.' });
      const leads = await getLeads();
      const fileMeta = leads.flatMap((lead) => Array.isArray(lead.files) ? lead.files : []).find((file) => file.key === key);
      if (!fileMeta) return response(404, { error: 'Archivo no encontrado.' });
      const blob = await filesStore.get(key, { type: 'arrayBuffer' });
      if (!blob) return response(404, { error: 'Archivo no encontrado.' });
      return {
        statusCode: 200,
        headers: {
          'Content-Type': fileMeta.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileMeta.name}"`,
          'Cache-Control': 'no-store'
        },
        isBase64Encoded: true,
        body: Buffer.from(blob).toString('base64')
      };
    }

    if (event.httpMethod === 'POST') {
      let request;
      try {
        request = JSON.parse(event.body || '{}');
      } catch {
        return response(400, { error: 'Invalid request body.' });
      }
      const { leadId, category, fileName, contentType, dataBase64 } = request;
      if (typeof leadId !== 'string' || typeof dataBase64 !== 'string' || !dataBase64) return response(400, { error: 'Solicitud inv\u00e1lida.' });
      if (!ALLOWED_CATEGORIES.includes(category)) return response(400, { error: 'Categor\u00eda de archivo inv\u00e1lida.' });
      if (!ALLOWED_CONTENT_TYPES.includes(contentType)) return response(400, { error: 'Solo se aceptan PDF o im\u00e1genes (PNG, JPG, WEBP).' });
      let buffer;
      try {
        buffer = Buffer.from(dataBase64, 'base64');
      } catch {
        return response(400, { error: 'No pudimos leer el archivo.' });
      }
      if (!buffer.length || buffer.length > MAX_FILE_BYTES) return response(400, { error: 'El archivo debe pesar menos de 8MB.' });
      const leads = await getLeads();
      const lead = leads.find((item) => item.id === leadId);
      if (!lead) return response(404, { error: 'Lead not found.' });
      const key = `${leadId}/${crypto.randomUUID()}`;
      await filesStore.set(key, buffer, { metadata: { contentType } });
      const fileRecord = {
        id: crypto.randomUUID(),
        key,
        category,
        name: sanitizeFileName(fileName),
        contentType,
        size: buffer.length,
        uploadedBy: session.username,
        uploadedAt: new Date().toISOString()
      };
      const updatedLeads = leads.map((item) => item.id === leadId ? { ...item, files: [...(Array.isArray(item.files) ? item.files : []), fileRecord] } : item);
      await saveLeads(updatedLeads);
      return response(200, { lead: getDuplicateMatches(updatedLeads).find((item) => item.id === leadId) });
    }

    if (event.httpMethod === 'DELETE') {
      let request;
      try {
        request = JSON.parse(event.body || '{}');
      } catch {
        return response(400, { error: 'Invalid request body.' });
      }
      const { leadId, fileId } = request;
      if (typeof leadId !== 'string' || typeof fileId !== 'string') return response(400, { error: 'Solicitud inv\u00e1lida.' });
      const leads = await getLeads();
      const lead = leads.find((item) => item.id === leadId);
      if (!lead) return response(404, { error: 'Lead not found.' });
      const target = (Array.isArray(lead.files) ? lead.files : []).find((file) => file.id === fileId);
      if (!target) return response(404, { error: 'Archivo no encontrado.' });
      await filesStore.delete(target.key);
      const updatedLeads = leads.map((item) => item.id === leadId ? { ...item, files: item.files.filter((file) => file.id !== fileId) } : item);
      await saveLeads(updatedLeads);
      return response(200, { lead: getDuplicateMatches(updatedLeads).find((item) => item.id === leadId) });
    }

    return response(405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('Unable to access lead files:', error);
    return response(503, { error: 'No pudimos procesar el archivo. Revisa Netlify Blobs y vuelve a intentarlo.' });
  }
};
