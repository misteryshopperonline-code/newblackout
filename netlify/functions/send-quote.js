const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const ECUADOR_MOBILE_PATTERN = /^09\d{8}$/;
const crypto = require('node:crypto');
const PDFDocument = require('pdfkit');
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

function normalizeEcuadorMobile(value) {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
}

function createQuotePdf({ name, location, needs, windows, quote }) {
  return new Promise((resolve, reject) => {
    let stage = 'creating-document';
    try {
      const document = new PDFDocument({ size: 'A4', margin: 52, info: { Title: 'Cotización referencial Blackout', Author: 'Blackout Window Coverings' } });
      const chunks = [];
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', (error) => reject(Object.assign(error, { quotePdfStage: stage })));

      stage = 'rendering-header';
      document.rect(0, 0, document.page.width, 112).fill('#2a202d');
      document.fillColor('#c8a7d3').font('Times-Bold').fontSize(30).text('B', 52, 36);
      document.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13).text('BLACKOUT', 88, 41);
      document.fillColor('#d9cedd').font('Helvetica').fontSize(8).text('WINDOW COVERINGS', 89, 59);
      document.fillColor('#2a202d').font('Times-Bold').fontSize(30).text('Cotización referencial', 52, 148);
      document.fillColor('#6c6670').font('Helvetica').fontSize(10).text(`Preparada para ${name}`, 52, 190);
      document.text(`Sector: ${location}`, 52, 207);
      document.fillColor('#69447d').font('Helvetica-Bold').fontSize(11).text('VALOR APROXIMADO', 52, 250);
      document.fillColor('#2a202d').font('Times-Bold').fontSize(26).text(`${formatCurrency(quote.low)} - ${formatCurrency(quote.high)}`, 52, 270);
      document.fillColor('#6c6670').font('Helvetica').fontSize(10).text(`${formatNumber(quote.area)} m2 aproximados`, 52, 306);
      document.moveTo(52, 335).lineTo(543, 335).strokeColor('#ded9df').stroke();
      document.fillColor('#2a202d').font('Helvetica-Bold').fontSize(12).text('Ambientes cotizados', 52, 358);
      let y = 387;
      stage = 'rendering-windows';
      windows.forEach((window) => {
        if (y > 680) {
          document.addPage();
          document.fillColor('#2a202d').font('Helvetica-Bold').fontSize(12).text('Ambientes cotizados', 52, 52);
          y = 81;
        }
        const width = Number(window.width);
        const height = Number(window.height);
        document.fillColor('#2a202d').font('Helvetica-Bold').fontSize(10).text(window.room || 'Ambiente sin nombre', 52, y);
        document.fillColor('#6c6670').font('Helvetica').fontSize(9).text(`${window.productLabel || 'Persiana'} · ${formatNumber(width)} m x ${formatNumber(height)} m`, 52, y + 15);
        document.fillColor('#2a202d').font('Helvetica-Bold').fontSize(9).text(`${formatNumber(width * height)} m2`, 465, y + 7, { width: 78, align: 'right' });
        y += 47;
      });
      if (y > 640) {
        document.addPage();
        y = 52;
      }
      stage = 'rendering-summary';
      document.moveTo(52, y).lineTo(543, y).strokeColor('#ded9df').stroke();
      document.fillColor('#2a202d').font('Helvetica-Bold').fontSize(12).text('Necesidades del proyecto', 52, y + 23);
      document.fillColor('#6c6670').font('Helvetica').fontSize(10).text(needs.length ? needs.join(', ') : 'Necesita recomendación', 52, y + 43, { width: 490 });
      document.fillColor('#6c6670').font('Helvetica').fontSize(8).text('Este valor es referencial. Confirmaremos tejido, mecanismo, acabados, instalación y precio final durante la visita técnica.', 52, 742, { width: 490, align: 'center' });
      stage = 'finalizing-document';
      document.end();
    } catch (error) {
      reject(Object.assign(error, { quotePdfStage: stage }));
    }
  });
}

exports.createQuotePdf = createQuotePdf;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' });

  let request;
  try {
    request = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Invalid request body.' });
  }

  const { name, email, location, needs, windows, quote } = request;
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const phone = normalizeEcuadorMobile(request.phone);
  if (
    typeof name !== 'string' || !name.trim() ||
    !EMAIL_PATTERN.test(normalizedEmail) || !ECUADOR_MOBILE_PATTERN.test(phone) ||
    !Array.isArray(windows) || !windows.length || !quote ||
    !Number.isFinite(quote.low) || !Number.isFinite(quote.high)
  ) {
    return response(400, { error: 'Invalid quote details.' });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.error('Missing email configuration.');
    return response(500, { error: 'Email service is not configured.' });
  }

  const validWindows = windows.map((window) => {
    const room = escapeHtml(window.room || 'Ambiente sin nombre');
    const product = escapeHtml(window.productLabel || 'Persiana');
    const width = Number(window.width);
    const height = Number(window.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return { room, product, width, height, productLabel: window.productLabel || 'Persiana' };
  }).filter(Boolean);

  if (!validWindows.length) return response(400, { error: 'Invalid window details.' });
  const windowRows = validWindows.map((window) => `<tr><td>${window.room}</td><td>${window.product}</td><td>${formatNumber(window.width)} m x ${formatNumber(window.height)} m</td><td>${formatNumber(window.width * window.height)} m2</td></tr>`);
  let quotePdf;
  try {
    quotePdf = await createQuotePdf({ name: name.trim(), location: typeof location === 'string' ? location : 'Por confirmar', needs: Array.isArray(needs) ? needs.filter((need) => typeof need === 'string') : [], windows: validWindows, quote });
  } catch (error) {
    console.error('Quote PDF generation failed:', JSON.stringify({
      stage: error.quotePdfStage || 'unknown',
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      nodeVersion: process.version,
      pdfkitVersion: require('pdfkit/package.json').version,
      windowCount: validWindows.length,
      quote: { area: quote.area, low: quote.low, high: quote.high }
    }));
    return response(500, { error: 'No pudimos generar el PDF de tu cotización.' });
  }
  console.info('Quote PDF generated:', JSON.stringify({ bytes: quotePdf.length, windowCount: validWindows.length, nodeVersion: process.version, pdfkitVersion: require('pdfkit/package.json').version }));

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
    <div style="font-family:Georgia,serif;color:#2a202d;line-height:1.5;max-width:640px;margin:0 auto">
      <div style="background:#2a202d;padding:24px 28px"><span style="display:inline-block;color:#c8a7d3;font-size:28px;font-weight:bold;vertical-align:middle">B</span><span style="display:inline-block;margin-left:12px;color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:2px;vertical-align:middle">BLACKOUT<br /><small style="color:#d9cedd;font-size:8px;font-weight:normal;letter-spacing:1px">WINDOW COVERINGS</small></span></div>
      <div style="padding:28px">
      <h1 style="font-size:26px;font-weight:600">Hola ${cleanName}</h1>
      <p>Gracias por compartir los datos de tu proyecto con Blackout Window Coverings.</p>
      <div style="padding:20px;background:#f5f2f7;border-left:1px solid #6e3a86">
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
      <p>Adjuntamos tu cotización en PDF para que la tengas a mano. Este valor es referencial; confirmaremos tejido, mecanismo, acabados, instalación y precio final durante la visita técnica.</p>
      <p style="color:#69447d;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px">BLACKOUT WINDOW COVERINGS</p>
      </div>
    </div>`;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [normalizedEmail],
      subject,
      html,
      text,
      attachments: [{ filename: 'cotizacion-blackout.pdf', content: quotePdf.toString('base64') }],
      reply_to: process.env.RESEND_REPLY_TO || 'info@blackout.com.ec',
      ...(process.env.QUOTE_NOTIFICATION_EMAIL ? { bcc: [process.env.QUOTE_NOTIFICATION_EMAIL] } : {})
    })
  });

  if (!resendResponse.ok) {
    const resendError = await resendResponse.text();
    console.error('Resend rejected quote email:', resendResponse.status, resendError);
    return response(502, { error: 'No pudimos enviar la cotización. Inténtalo nuevamente.' });
  }

  try {
    await saveLead(event, {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      phone,
      notes: [],
      location: typeof location === 'string' ? location : 'Por confirmar',
      needs: Array.isArray(needs) ? needs.filter((need) => typeof need === 'string') : [],
      windows: validWindows.map(({ room, productLabel, width, height }) => ({ room, productLabel, width, height })),
      quote: { area: Number(quote.area), low: Number(quote.low), high: Number(quote.high) },
      status: 'Nuevo',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Quote email sent but prospect could not be saved:', error);
  }

  return response(200, { success: true });
};