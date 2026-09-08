'use client';

import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { calculateQuote, PRODUCTS, PRICING, currency, number, isSpecial, type QuoteWindow, type ProductId } from '@/lib/pricing';
import { quoteSchema } from '@/lib/schema';

type WindowDraft = { id: number; room: string; product: ProductId; width: string; height: string };
const marketing = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://blackout.com.ec';
const needsOptions = ['Controlar la luz', 'Más privacidad', 'Reducir el calor', 'Renovar el ambiente'];

export default function Calculator() {
  const nextId = useRef(2);
  const [windows, setWindows] = useState<WindowDraft[]>([{ id: 1, room: 'Sala principal', product: 'screen', width: '2', height: '2.2' }]);
  const [activeId, setActiveId] = useState(1);
  const [location, setLocation] = useState('Quito');
  const [locationDetail, setLocationDetail] = useState('');
  const [distance, setDistance] = useState('10');
  const [needs, setNeeds] = useState(['Controlar la luz']);
  const [menu, setMenu] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const resetFeedback = () => {
    if (status !== 'sending') { setStatus('idle'); setMessage(''); }
  };
  const data: QuoteWindow[] = windows.map(item => ({ room: item.room, product: item.product, width: Number(item.width), height: Number(item.height) }));
  const validMeasures = data.every(item => Number.isFinite(item.width) && Number.isFinite(item.height) && item.width >= 0.2 && item.width <= 12 && item.height >= 0.2 && item.height <= 8);
  const validDistance = location !== 'Otro sector' || (distance !== '' && Number.isFinite(Number(distance)) && Number(distance) >= 0 && Number(distance) <= 2000);
  const quote = validMeasures && validDistance ? calculateQuote(data, location === 'Otro sector', Number(distance)) : null;
  const active = windows.find(item => item.id === activeId) || windows[0];
  const activeWidth = Math.max(0, Number(active.width) || 0);
  const edit = (id: number, patch: Partial<WindowDraft>) => {
    setWindows(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
    if (status !== 'sending') { setStatus('idle'); setMessage(''); }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const parsed = quoteSchema.safeParse({ name: fields.get('name'), email: fields.get('email'), phone: fields.get('phone'), website: fields.get('website'), windows: data, location, locationDetail, distanceKm: Number(distance), needs });
    if (!parsed.success || !validMeasures || !validDistance) {
      setStatus('error'); setMessage(parsed.error?.issues[0]?.message || 'Revisa las medidas y la distancia.'); return;
    }
    setStatus('sending'); setMessage('');
    try {
      const response = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(45000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos enviar la cotización.');
      setStatus('success'); setMessage('Cotización enviada por correo. Revisa tu bandeja de entrada.');
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'El envío está tardando. Inténtalo nuevamente en unos momentos.');
    }
  }

  return <>
    <header className={`nav quote-nav scrolled${menu ? ' menu-open' : ''}`}>
      <a className="brand" href={marketing} aria-label="Blackout, inicio"><svg viewBox="0 0 44 44" aria-hidden="true"><path d="M8 4h10c8 0 12 3 12 9 0 4-2 7-6 8 6 1 9 4 9 9 0 7-5 10-14 10H8V4Zm8 7v7h2c3 0 5-1 5-4 0-2-2-3-5-3h-2Zm0 14v8h3c4 0 6-1 6-4 0-3-2-4-6-4h-3Z" /></svg><span>BLACKOUT<small>WINDOW COVERINGS</small></span></a>
      <nav id="mobile-navigation" aria-label="Principal"><a href={`${marketing}/#soluciones`}>Soluciones</a><a href={`${marketing}/#proyectos`}>Proyectos</a><a href={`${marketing}/blog/`}>Blog</a><a href="#quote-form" onClick={() => setMenu(false)}>Cotizador</a></nav>
      <a className="nav-cta" href="https://wa.me/593992933619" target="_blank" rel="noreferrer">Hablar con un asesor ↗</a>
      <button type="button" className="menu" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu(!menu)} onKeyDown={event => { if (event.key === 'Escape') setMenu(false); }}><span /><span /></button>
    </header>
    <main className="quote-page">
      <section className="quote-intro"><h1>Tu proyecto empieza con una buena medida.</h1><p>Organiza las ventanas de tu espacio y consulta el valor aproximado. Recibe el resumen en PDF por correo; confirmaremos materiales, instalación y precio durante la asesoría.</p></section>
      <form id="quote-form" className="quote-workspace" onSubmit={submit} onChange={resetFeedback} onClick={event => { if ((event.target as HTMLElement).closest('.add-window, .remove-window')) resetFeedback(); }}>
        <div className="quote-form">
          <div className="form-heading"><div><span>01</span><h2>Cuéntanos sobre tus ventanas</h2></div><p>Las medidas pueden ser aproximadas. Nuestro equipo realizará la medición técnica antes de fabricar.</p></div>
          <div className={`measurement-ruler${activeWidth > 3 ? ' is-over-range' : ''}`}>
            <div className="ruler-heading"><span>Referencia de ancho</span><strong aria-live="polite">{active.room || 'Ambiente'} · {number(activeWidth)} m</strong></div>
            <div className="ruler-bed" aria-hidden="true"><div className="ruler-indicator" style={{ '--ruler-progress': Math.min(activeWidth / 3, 1) } as CSSProperties} /><div className="ruler-ticks">{[0, 50, 100, 150, 200, 250, 300].map((value, index) => <span key={value} style={{ left: `${index / 6 * 100}%` }}>{value}{index === 6 ? ' cm' : ''}</span>)}</div></div>
            <p>Selecciona el ancho de un ambiente para verlo en la escala de 0 a 300 cm. Referencia visual, no a tamaño real.</p>
          </div>
          <div className="window-list">{windows.map((item, index) => <article key={item.id} className={`window-row${isSpecial(data[index]) ? ' has-special-measure' : ''}`}>
            <div className="row-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
            <div className="field field-room"><label htmlFor={`room-${item.id}`}>Ambiente</label><input id={`room-${item.id}`} value={item.room} required maxLength={80} onChange={event => edit(item.id, { room: event.target.value })} /></div>
            <div className="field field-product"><label htmlFor={`product-${item.id}`}>Tipo de persiana</label><select id={`product-${item.id}`} value={item.product} onChange={event => edit(item.id, { product: event.target.value as ProductId })}>{Object.entries(PRODUCTS).map(([id, product]) => <option key={id} value={id}>{product.label} · ${product.rate}/m²</option>)}</select></div>
            <div className="field field-measure"><label htmlFor={`width-${item.id}`}>Ancho <small>metros</small></label><input id={`width-${item.id}`} type="number" inputMode="decimal" min="0.2" max="12" step="0.01" required value={item.width} onFocus={() => setActiveId(item.id)} onChange={event => { setActiveId(item.id); edit(item.id, { width: event.target.value }); }} /></div>
            <div className="field field-measure"><label htmlFor={`height-${item.id}`}>Alto <small>metros</small></label><input id={`height-${item.id}`} type="number" inputMode="decimal" min="0.2" max="8" step="0.01" required value={item.height} onChange={event => edit(item.id, { height: event.target.value })} /></div>
            <button className="remove-window" type="button" disabled={windows.length === 1} aria-label={`Eliminar ${item.room}`} onClick={() => setWindows(items => items.filter(row => row.id !== item.id))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg></button>
          </article>)}</div>
          <button type="button" className="add-window" disabled={windows.length >= 8} onClick={() => { const id = nextId.current++; setWindows(items => [...items, { id, room: `Ambiente ${items.length + 1}`, product: 'screen', width: '1.5', height: '2.2' }]); setActiveId(id); }}>Agregar otro ambiente</button>
          <fieldset><legend><span>02</span> ¿Qué quieres mejorar?</legend><p>Selecciona todas las opciones que apliquen.</p><div className="need-options">{needsOptions.map(need => <label key={need}><input type="checkbox" checked={needs.includes(need)} onChange={event => setNeeds(items => event.target.checked ? [...items, need] : items.filter(value => value !== need))} /><span>{need}</span></label>)}</div></fieldset>
          <fieldset><legend><span>03</span> ¿Dónde instalaremos?</legend><div className="location-options">{['Quito', 'Cumbayá', 'Otro sector'].map(place => <label key={place}><input type="radio" name="location" value={place} checked={location === place} onChange={() => setLocation(place)} /><span>{place}</span></label>)}</div>
            {location === 'Otro sector' && <div className="other-location"><label htmlFor="location-detail">Ciudad o sector</label><input id="location-detail" value={locationDetail} required maxLength={150} onChange={event => setLocationDetail(event.target.value)} /><label htmlFor="distance-km">Distancia adicional aproximada (km)</label><input id="distance-km" type="number" min="0" max="2000" step="1" required value={distance} onChange={event => setDistance(event.target.value)} /></div>}
          </fieldset>
        </div>
        <aside className="quote-summary" aria-labelledby="summary-title">
          <div className="summary-topline"><span>Resumen del proyecto</span><strong>{windows.length} {windows.length === 1 ? 'ambiente' : 'ambientes'}</strong></div>
          <h2 id="summary-title">Una primera lectura de tu espacio.</h2>
          <div className="area-display"><strong>{quote ? number(quote.area) : '—'}</strong><span>m² aproximados</span></div>
          <div className="estimate-display" aria-live="polite"><span>Valor aproximado</span><strong>{quote ? `${currency(quote.low)} – ${currency(quote.high)}` : 'Completa las medidas'}</strong><p>Incluye descuento, instalación e IVA. Margen referencial de ±6%.</p></div>
          <div className="summary-lines">{data.map((item, index) => <div className="summary-line" key={windows[index].id}><span><strong>{item.room}</strong><small>{PRODUCTS[item.product].label} · {currency(PRODUCTS[item.product].rate)}/m²</small></span><span>{number(Math.max(0, item.width * item.height) || 0)} m²</span></div>)}</div>
          {validMeasures && data.some(isSpecial) && <p className="measure-warning">Una o más medidas están fuera del rango estándar. El precio requiere revisión técnica.</p>}
          {quote && <details className="price-breakdown"><summary>Ver desglose del cálculo</summary>{[['Productos', quote.subtotal], ['Descuento (40%)', -quote.discount], ['Instalación', quote.installation], ['IVA (15%)', quote.tax], ['Total calculado', quote.total]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{currency(Number(value))}</strong></div>)}</details>}
          {quote && <p className="courtesy-status">{quote.area >= PRICING.courtesyArea ? 'Tu proyecto alcanza la cortesía: lámina de protección solar en un ambiente adicional.' : `A ${number(PRICING.courtesyArea - quote.area)} m² de obtener una lámina de protección solar sin costo en un ambiente adicional.`}</p>}
          <div className="summary-note"><p>El precio final se confirma durante la visita técnica. No realizaremos ningún cobro desde esta página.</p></div>
          <div className="lead-fields"><label htmlFor="lead-name">Tu nombre</label><input id="lead-name" name="name" autoComplete="name" required minLength={2} maxLength={100} /><label htmlFor="lead-email">Tu correo electrónico</label><input id="lead-email" name="email" type="email" autoComplete="email" required maxLength={254} /><label htmlFor="lead-phone">Tu celular</label><input id="lead-phone" name="phone" type="tel" autoComplete="tel-national" required pattern="09[0-9]{8}" maxLength={10} placeholder="0992933619" /><small>Celular ecuatoriano de 10 dígitos.</small></div>
          <div className="honeypot" aria-hidden="true"><label htmlFor="website">Sitio web</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <p className={status === 'error' ? 'field-error' : 'status-message'} role="status">{message}</p>
          <button className="send-quote" disabled={status === 'sending' || status === 'success' || !quote} type="submit">{status === 'sending' ? 'Enviando cotización…' : status === 'success' ? 'Cotización enviada' : 'Enviar cotización por correo'}</button>
          <p className="response-copy">Te enviaremos un PDF con el resumen de tu proyecto.</p>
        </aside>
      </form>
      <section className="measure-guide"><div className="measure-copy"><h2>Medir es más fácil de lo que parece.</h2><p>Mide el ancho y el alto del espacio que quieres cubrir. Usa metros y conserva dos decimales cuando sea posible.</p><a href={`${marketing}/blog/precio-metro-cuadrado-persianas.html`}>Entender cómo se calcula una persiana →</a></div><div className="window-diagram" aria-label="Referencia de ancho y alto"><div className="measure-width"><span>Ancho</span></div><div className="measure-height"><span>Alto</span></div><div className="diagram-light" /><div className="diagram-blind">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div></div></section>
    </main>
    <footer className="quote-footer"><div className="brand">BLACKOUT</div><div><strong>Visítanos</strong><p>Av. del Establo N60, Edificio Cemacol, Local 7<br />Toribio Montes N30-49 y Cuero y Caicedo</p></div><div><strong>Contáctanos</strong><p>info@blackout.com.ec<br />099 293 3619</p></div><div className="footer-social"><a href={`${marketing}/blog/`}>Blog</a><a href={marketing}>Sitio principal</a></div></footer>
  </>;
}
