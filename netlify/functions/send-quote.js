const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const crypto = require('node:crypto');
const { saveLead } = require('./crm-leads');

function formatCurrency(value) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' });

  let request;
  try {
    request = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Invalid request body.' });
  }

  const { name, email, location, needs, windows, quote } = request;
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !EMAIL_PATTERN.test(email) ||
    !Array.isArray(windows) || !windows.length || !quote ||
    !Number.isFinite(quote.low) || !Number.isFinite(quote.high)
  ) {
    return response(400, { error: 'Invalid quote details.' });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.error('Missing email configuration.');
    return response(500, { error: 'Email service is not configured.' });
  }

  const windowRows = windows.map((window) => {
    const room = escapeHtml(window.room || 'Ambiente sin nombre');
    const product = escapeHtml(window.productLabel || 'Persiana');
    const width = Number(window.width);
    const height = Number(window.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return `<tr><td>${room}</td><td>${product}</td><td>${formatNumber(width)} m x ${formatNumber(height)} m</td><td>${formatNumber(width * height)} m2</td></tr>`;
  }).filter(Boolean);

  if (!windowRows.length) return response(400, { error: 'Invalid window details.' });

  await saveLead(event, {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim(),
    location: typeof location === 'string' ? location : 'Por confirmar',
    needs: Array.isArray(needs) ? needs.filter((need) => typeof need === 'string') : [],
    windows: windows.map(({ room, productLabel, width, height }) => ({ room, productLabel, width: Number(width), height: Number(height) })),
    quote: { area: Number(quote.area), low: Number(quote.low), high: Number(quote.high) },
    status: 'Nuevo',
    createdAt: new Date().toISOString()
  });

  const cleanName = escapeHtml(name.trim());
  const cleanLocation = escapeHtml(typeof location === 'string' ? location : 'Por confirmar');
  const cleanNeeds = Array.isArray(needs) && needs.length
    ? needs.map(escapeHtml).join(', ')
    : 'Necesito recomendación';
  const subject = `Tu cotización referencial Blackout, ${name.trim()}`;
  const text = [
    `Hola ${name.trim()},`,
    '',
    'Gracias por compartir los datos de tu proyecto con Blackout Window Coverings.',
    `Valor aproximado: ${formatCurrency(quote.low)} - ${formatCurrency(quote.high)}.`,
    `Superficie aproximada: ${formatNumber(quote.area)} m2.`,
    `Sector: ${location || 'Por confirmar'}.`,
    '',
    'Este valor es referencial. Confirmaremos tejido, mecanismo, acabados, instalación y precio final durante la visita técnica.',
    '',
    'Blackout Window Coverings'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;color:#251e2d;line-height:1.5;max-width:640px;margin:0 auto">
      <h1 style="font-size:26px;font-weight:600">Hola ${cleanName}</h1>
      <p>Gracias por compartir los datos de tu proyecto con Blackout Window Coverings.</p>
      <div style="padding:20px;background:#f5f2f7;border-left:4px solid #6e3a86">
        <strong>Valor aproximado</strong><br />
        <span style="font-size:24px">${formatCurrency(quote.low)} - ${formatCurrency(quote.high)}</span><br />
        <span>${formatNumber(quote.area)} m2 aproximados</span>
      </div>
      <h2 style="font-size:18px">Resumen de tu proyecto</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th align="left">Ambiente</th><th align="left">Persiana</th><th align="left">Medidas</th><th align="left">Área</th></tr></thead>
        <tbody>${windowRows.join('')}</tbody>
      </table>
      <p><strong>Sector:</strong> ${cleanLocation}<br /><strong>Necesidades:</strong> ${cleanNeeds}</p>
      <p>Este valor es referencial. Confirmaremos tejido, mecanismo, acabados, instalación y precio final durante la visita técnica.</p>
      <p>Blackout Window Coverings</p>
    </div>`;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email.trim()],
      subject,
      html,
      text,
      reply_to: process.env.RESEND_REPLY_TO || 'info@blackout.com.ec',
      ...(process.env.QUOTE_NOTIFICATION_EMAIL ? { bcc: [process.env.QUOTE_NOTIFICATION_EMAIL] } : {})
    })
  });

  if (!resendResponse.ok) {
    console.error('Resend rejected quote email:', await resendResponse.text());
    return response(502, { error: 'Unable to send quote email.' });
  }

  return response(200, { success: true });
};