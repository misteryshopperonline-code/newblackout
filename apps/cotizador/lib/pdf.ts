import PDFDocument from 'pdfkit';
import { calculateQuote, PRODUCTS, currency, number } from './pricing';
import type { QuoteRequest } from './schema';

export async function quotePdf(data: QuoteRequest, quote: ReturnType<typeof calculateQuote>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 52, info: { Title: 'Cotización referencial Blackout', Author: 'Blackout' } });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fillColor('#654878').font('Times-Bold').fontSize(26).text('BLACKOUT');
    doc.fillColor('#211a25').fontSize(24).text('Cotización referencial').moveDown();
    doc.font('Helvetica').fontSize(11).text(`Preparada para: ${data.name}`).text(`Sector: ${data.location === 'Otro sector' ? data.locationDetail : data.location}`).moveDown();
    doc.fontSize(20).text(`${currency(quote.low)} - ${currency(quote.high)}`).fontSize(11).text(`${number(quote.area)} m2 aproximados`).moveDown();
    for (const item of data.windows) {
      if (doc.y > 650) doc.addPage();
      doc.font('Helvetica-Bold').text(item.room).font('Helvetica').text(`${PRODUCTS[item.product].label}: ${number(item.width)} m x ${number(item.height)} m`).moveDown(0.6);
    }
    if (doc.y > 560) doc.addPage();
    doc.moveDown().text(`Productos: ${currency(quote.subtotal)}`).text(`Descuento (40%): -${currency(quote.discount)}`).text(`Instalación: ${currency(quote.installation)}`).text(`IVA (15%): ${currency(quote.tax)}`).font('Helvetica-Bold').text(`Total calculado: ${currency(quote.total)}`).moveDown();
    doc.font('Helvetica').text(`Necesidades: ${data.needs.join(', ') || 'Asesoría'}`).moveDown();
    doc.fontSize(9).fillColor('#625d58').text('Valor aproximado sujeto a confirmación de materiales, medidas e instalación durante la visita técnica.');
    doc.end();
  });
}
