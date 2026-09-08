import { quoteSchema } from '@/lib/schema';
import { calculateQuote, PRODUCTS, currency } from '@/lib/pricing';
import { quotePdf } from '@/lib/pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Origen no permitido.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: 'Formato no válido.' }, 415);
  // Read a bounded stream rather than trusting Content-Length from the client.
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: 'Faltan los datos de la cotización.' }, 400);
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 20000) { await reader.cancel(); return reply({ error: 'La solicitud es demasiado grande.' }, 413); }
    chunks.push(value);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return reply({ error: 'Solicitud no válida.' }, 400); }
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return reply({ error: parsed.error.issues[0].message }, 400);
  const data = parsed.data;
  // All prices and product labels come from the server's shared tariff table.
  const quote = calculateQuote(data.windows, data.location === 'Otro sector', data.distanceKm);
  try {
    if (process.env.QUOTE_SERVICE_URL) {
      const service = new URL(process.env.QUOTE_SERVICE_URL);
      if (service.protocol !== 'https:') throw new Error('QUOTE_SERVICE_URL must use HTTPS');
      const response = await fetch(service, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ ...data, location: data.location === 'Otro sector' ? `${data.locationDetail} (${data.distanceKm} km adicionales)` : data.location, windows: data.windows.map(item => ({ ...item, ...PRODUCTS[item.product], productLabel: PRODUCTS[item.product].label })), quote })
      });
      if (!response.ok) return reply({ error: 'No pudimos enviar la cotización. Inténtalo nuevamente.' }, 502);
      return reply({ success: true });
    }
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return reply({ error: 'El envío por correo aún no está configurado. Contacta a un asesor.' }, 503);
    const pdf = await quotePdf(data, quote);
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL, to: [data.email],
        subject: 'Tu cotización referencial Blackout',
        text: `Hola ${data.name},\n\nAdjuntamos el PDF de tu proyecto. Valor aproximado: ${currency(quote.low)} - ${currency(quote.high)}. El precio final se confirma durante la visita técnica.\n\nBlackout Window Coverings`,
        reply_to: process.env.RESEND_REPLY_TO || 'info@blackout.com.ec',
        ...(process.env.QUOTE_NOTIFICATION_EMAIL ? { bcc: [process.env.QUOTE_NOTIFICATION_EMAIL] } : {}),
        attachments: [{ filename: 'cotizacion-blackout.pdf', content: pdf.toString('base64') }]
      })
    });
    if (!result.ok) return reply({ error: 'No pudimos enviar la cotización. Inténtalo nuevamente.' }, 502);
    return reply({ success: true });
  } catch {
    console.error('Quote delivery failed');
    return reply({ error: 'El servicio de envío no está disponible. Inténtalo nuevamente.' }, 502);
  }
}
