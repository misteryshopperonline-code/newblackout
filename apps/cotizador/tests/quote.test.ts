import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote } from '../lib/pricing';
import { quoteSchema } from '../lib/schema';
import { quotePdf } from '../lib/pdf';
import { POST } from '../app/api/quotes/route';
const windows = [{ room: 'Sala', product: 'screen' as const, width: 2, height: 2.2 }];
const request = { name: 'Prueba local', email: 'test@example.com', phone: '0992933619', location: 'Quito', locationDetail: '', distanceKm: 0, needs: [], windows };
test('tariff preserves the existing 4.4m² reference', () => {
  assert.deepEqual(calculateQuote(windows), { area: 4.4, subtotal: 149.6, discount: 59.84, installation: 172.48, tax: 39.34, total: 301.58, low: 283.48, high: 319.67 });
  assert.equal(calculateQuote(windows, true, 10).installation, 207.48);
});
test('validation rejects invalid measurements and removes client-supplied totals', () => {
  assert.equal(quoteSchema.safeParse({ ...request, windows: [{ ...windows[0], width: -1 }] }).success, false);
  assert.equal(quoteSchema.safeParse({ ...request, windows: [{ ...windows[0], product: 'unknown' }] }).success, false);
  assert.equal(quoteSchema.safeParse({ ...request, windows: Array(9).fill(windows[0]) }).success, false);
  const parsed = quoteSchema.parse({ ...request, quote: { total: 1 } });
  assert.equal('quote' in parsed, false);
});
test('PDF generates an actual PDF document without sending email', async () => {
  const data = quoteSchema.parse(request);
  const pdf = await quotePdf(data, calculateQuote(windows));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 1000);
});

test('API rejects cross-origin, invalid JSON, invalid fields and oversized bodies', async () => {
  const make = (body: string, headers = {}) => new Request('http://localhost:3000/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
  assert.equal((await POST(make('{}', { origin: 'https://other.example' }))).status, 403);
  assert.equal((await POST(make('invalid'))).status, 400);
  assert.equal((await POST(make('{}'))).status, 400);
  assert.equal((await POST(make('x'.repeat(20001)))).status, 413);
});

test('API recalculates the legacy payload and handles delivery failure without real email', async context => {
  const prior = process.env.QUOTE_SERVICE_URL;
  process.env.QUOTE_SERVICE_URL = 'https://legacy.example/quote';
  context.after(() => { if (prior === undefined) delete process.env.QUOTE_SERVICE_URL; else process.env.QUOTE_SERVICE_URL = prior; });
  const mock = context.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    const payload = JSON.parse(String(options.body));
    assert.equal(payload.quote.total, 301.58);
    assert.equal(payload.windows[0].rate, 34);
    return Response.json({ success: true });
  });
  const make = () => new Request('http://localhost:3000/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...request, quote: { total: 1 } }) });
  assert.equal((await POST(make())).status, 200);
  mock.mock.mockImplementation(async () => Response.json({ error: 'provider failed' }, { status: 500 }));
  assert.equal((await POST(make())).status, 502);
});
