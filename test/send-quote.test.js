const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createQuotePdf, handler } = require('../netlify/functions/send-quote');

function quote(overrides = {}) {
  return {
    name: 'Ana Montúfar',
    location: 'Cumbayá',
    needs: ['Controlar la luz', 'Privacidad y estética'],
    windows: [{ room: 'Sala principal', productLabel: 'Lámina de protección solar', width: 2.4, height: 2.2 }],
    quote: { area: 5.28, low: 412.8, high: 465.6 },
    ...overrides
  };
}

async function assertValidPdf(data) {
  const pdf = await createQuotePdf(data);
  assert.ok(Buffer.isBuffer(pdf));
  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.includes(Buffer.from('%%EOF')));
}

test('genera una cotización PDF con el branding de Blackout', async () => {
  await assertValidPdf(quote());
});

test('genera una cotización PDF para el máximo de ambientes', async () => {
  const windows = Array.from({ length: 8 }, (_, index) => ({
    room: `Ambiente ${index + 1}: habitación`,
    productLabel: index % 2 ? 'Dimout' : 'Screen',
    width: 2.5,
    height: 2.3
  }));
  await assertValidPdf(quote({ windows, quote: { area: 46, low: 1790, high: 2010 } }));
});

test('Netlify incluye las fuentes dinámicas de PDFKit en las funciones', () => {
  const config = fs.readFileSync(path.join(__dirname, '..', 'netlify.toml'), 'utf8');
  assert.match(config, /external_node_modules\s*=\s*\["pdfkit"\]/);
  assert.match(config, /node_modules\/pdfkit\/js\/standard-fonts\/\*\*/);
  assert.match(config, /node_modules\/pdfkit\/js\/data\/\*\*/);
});

test('devuelve un 502 trazable cuando Resend no puede recibir la cotización', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'cotizaciones@blackout.com.ec';
  global.fetch = async () => { throw new TypeError('fetch failed'); };

  try {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ ...quote(), email: 'ana@blackout.com.ec', phone: '0992933619' })
    });
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 502);
    assert.match(body.error, /Código: [\da-f-]{36}/);
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFromEmail === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFromEmail;
  }
});