const PRICING = {
  products: {
    dimout: { label: 'Dimout', rate: 38 },
    screen: { label: 'Screen', rate: 34 },
    blackout: { label: 'Blackout', rate: 34 },
    lamina: { label: 'Lámina de protección solar', rate: 34 }
  },
  discountPct: 40,
  installation: 172.48,
  extraKmRate: 3.5,
  ivaPct: 15,
  estimateVariation: 0.06,
  courtesyThresholdM2: 25,
  courtesy: 'Lámina de protección solar sin costo en un ambiente adicional',
  standard: { minWidth: 0.4, maxWidth: 3, minHeight: 0.4, maxHeight: 3.2 }
};

const list = document.querySelector('#window-list');
const template = document.querySelector('#window-template');
const addButton = document.querySelector('#add-window');
const totalArea = document.querySelector('#total-area');
const windowCount = document.querySelector('#window-count');
const summaryLines = document.querySelector('#summary-lines');
const estimateRange = document.querySelector('#estimate-range');
const priceSubtotal = document.querySelector('#price-subtotal');
const priceDiscount = document.querySelector('#price-discount');
const priceInstallation = document.querySelector('#price-installation');
const priceTax = document.querySelector('#price-tax');
const priceTotal = document.querySelector('#price-total');
const measureWarning = document.querySelector('#measure-warning');
const courtesyStatus = document.querySelector('#courtesy-status');
const sendButton = document.querySelector('#send-quote');
const nameInput = document.querySelector('#lead-name');
const emailInput = document.querySelector('#lead-email');
const phoneInput = document.querySelector('#lead-phone');
const formError = document.querySelector('#form-error');
const otherLocation = document.querySelector('[data-other-location]');
const locationDetail = document.querySelector('#location-detail');
const distanceInput = document.querySelector('#distance-km');
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#mobile-navigation');
const ruler = document.querySelector('.measurement-ruler');
const rulerIndicator = document.querySelector('[data-ruler-indicator]');
const rulerValue = document.querySelector('[data-ruler-value]');
const MAX_WINDOWS = 8;
let activeWidthInput = null;

const initialWindows = [
  { room: 'Sala principal', product: 'screen', width: 2, height: 2.2 }
];

function formatNumber(value) {
  return new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
}

function rows() {
  return [...list.querySelectorAll('.window-row')];
}

function rowData(row) {
  const read = (field) => row.querySelector(`[data-field="${field}"]`).value.trim();
  const product = read('product');
  return {
    room: read('room') || 'Ambiente sin nombre',
    product,
    productLabel: PRICING.products[product].label,
    rate: PRICING.products[product].rate,
    width: Number(read('width')) || 0,
    height: Number(read('height')) || 0
  };
}

function calculate(data = rows().map(rowData)) {
  const area = data.reduce((sum, item) => sum + item.width * item.height, 0);
  const subtotal = data.reduce((sum, item) => sum + item.width * item.height * item.rate, 0);
  const discount = subtotal * (PRICING.discountPct / 100);
  const outsideCity = document.querySelector('input[name="location"]:checked').value === 'Otro sector';
  const extraDistance = outsideCity ? Math.max(Number(distanceInput.value) || 0, 0) : 0;
  const installation = PRICING.installation + extraDistance * PRICING.extraKmRate;
  const preTax = subtotal - discount + installation;
  const tax = preTax * (PRICING.ivaPct / 100);
  const total = preTax + tax;
  return {
    area, subtotal, discount, installation, tax, total,
    low: total * (1 - PRICING.estimateVariation),
    high: total * (1 + PRICING.estimateVariation)
  };
}

function isOutsideStandard(item) {
  const limits = PRICING.standard;
  if (!item.width || !item.height) return false;
  return item.width < limits.minWidth || item.width > limits.maxWidth || item.height < limits.minHeight || item.height > limits.maxHeight;
}

function setMenuOpen(open) {
  const header = document.querySelector('[data-header]');
  header.classList.toggle('menu-open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
}

function escapeHtml(value) {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}

function normalizeEcuadorMobile(value) {
  return value.replace(/[\s-]/g, '');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value);
}

function updateRuler(input) {
  if (!input) return;
  activeWidthInput = input;
  const row = input.closest('.window-row');
  const room = row.querySelector('[data-field="room"]').value.trim() || 'Ambiente sin nombre';
  const width = Math.max(Number(input.value) || 0, 0);
  const progress = Math.min(width / PRICING.standard.maxWidth, 1);
  rulerIndicator.style.setProperty('--ruler-progress', progress);
  ruler.classList.toggle('is-over-range', width > PRICING.standard.maxWidth);
  rulerValue.textContent = `${room} · ${formatNumber(width)} m`;
  ruler.setAttribute('aria-label', `Regla de referencia: ${room}, ancho ${formatNumber(width)} metros sobre una escala de 0 a 3 metros`);
}

function updateSummary() {
  const data = rows().map(rowData);
  const quote = calculate(data);
  totalArea.textContent = formatNumber(quote.area);
  windowCount.textContent = `${data.length} ${data.length === 1 ? 'ambiente' : 'ambientes'}`;
  estimateRange.textContent = `${formatCurrency(quote.low)} – ${formatCurrency(quote.high)}`;
  priceSubtotal.textContent = formatCurrency(quote.subtotal);
  priceDiscount.textContent = `−${formatCurrency(quote.discount)}`;
  priceInstallation.textContent = formatCurrency(quote.installation);
  priceTax.textContent = formatCurrency(quote.tax);
  priceTotal.textContent = formatCurrency(quote.total);

  summaryLines.innerHTML = data.map((item) => `
    <div class="summary-line">
      <span><strong>${escapeHtml(item.room)}</strong><small>${escapeHtml(item.productLabel)} · ${formatCurrency(item.rate)}/m²</small></span>
      <span>${formatNumber(item.width * item.height)} m²</span>
    </div>
  `).join('');

  const specialMeasures = data.some(isOutsideStandard);
  measureWarning.hidden = !specialMeasures;
  measureWarning.textContent = specialMeasures ? 'Una o más medidas están fuera del rango estándar. El valor mostrado es orientativo y requiere revisión técnica.' : '';

  if (quote.area >= PRICING.courtesyThresholdM2) {
    courtesyStatus.textContent = `Tu proyecto alcanza la cortesía: ${PRICING.courtesy}.`;
  } else {
    courtesyStatus.textContent = `A ${formatNumber(PRICING.courtesyThresholdM2 - quote.area)} m² de obtener: ${PRICING.courtesy}.`;
  }

  rows().forEach((row, index) => {
    row.querySelector('.row-index').textContent = String(index + 1).padStart(2, '0');
    row.querySelector('.remove-window').disabled = data.length === 1;
    row.classList.toggle('has-special-measure', isOutsideStandard(data[index]));
  });
  addButton.disabled = data.length >= MAX_WINDOWS;
}

function addWindow(values = {}) {
  const fragment = template.content.cloneNode(true);
  const row = fragment.querySelector('.window-row');
  row.querySelector('[data-field="room"]').value = values.room || `Ambiente ${rows().length + 1}`;
  row.querySelector('[data-field="product"]').value = values.product || 'screen';
  row.querySelector('[data-field="width"]').value = values.width || 1.5;
  row.querySelector('[data-field="height"]').value = values.height || 2.2;
  row.addEventListener('input', (event) => {
    if (event.target.matches('[data-field="width"],[data-field="height"]') && Number(event.target.value) >= Number(event.target.min)) {
      event.target.removeAttribute('aria-invalid');
      formError.textContent = '';
    }
    updateSummary();
  });
  row.addEventListener('change', updateSummary);
  row.querySelector('.remove-window').addEventListener('click', () => {
    row.remove();
    if (!document.contains(activeWidthInput)) updateRuler(rows()[0]?.querySelector('[data-field="width"]'));
    updateSummary();
  });
  list.appendChild(fragment);
  if (!activeWidthInput) updateRuler(row.querySelector('[data-field="width"]'));
  updateSummary();
}

function selectedLocation() {
  const location = document.querySelector('input[name="location"]:checked').value;
  if (location === 'Otro sector' && locationDetail.value.trim()) return `${locationDetail.value.trim()} (${Math.max(Number(distanceInput.value) || 0, 0)} km adicionales)`;
  return location;
}

addButton.addEventListener('click', () => {
  if (rows().length < MAX_WINDOWS) addWindow();
});

document.querySelectorAll('input[name="location"]').forEach((input) => {
  input.addEventListener('change', () => {
    otherLocation.hidden = input.value !== 'Otro sector' || !input.checked;
    if (!otherLocation.hidden) locationDetail.focus();
    updateSummary();
  });
});
distanceInput.addEventListener('input', updateSummary);
locationDetail.addEventListener('input', updateSummary);
list.addEventListener('focusin', (event) => {
  if (event.target.matches('[data-field="width"]')) updateRuler(event.target);
});
list.addEventListener('input', (event) => {
  if (event.target === activeWidthInput || event.target.matches('[data-field="room"]') && event.target.closest('.window-row') === activeWidthInput?.closest('.window-row')) updateRuler(activeWidthInput);
});

sendButton.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.setAttribute('aria-invalid', 'true');
    formError.textContent = 'Escribe tu nombre para que podamos identificar tu solicitud.';
    nameInput.focus();
    return;
  }
  const email = emailInput.value.trim();
  if (!email || !emailInput.validity.valid || !isValidEmail(email)) {
    emailInput.setAttribute('aria-invalid', 'true');
    formError.textContent = 'Escribe un correo electrónico válido para recibir tu cotización.';
    emailInput.focus();
    return;
  }
  const phone = normalizeEcuadorMobile(phoneInput.value);
  if (!/^09\d{8}$/.test(phone)) {
    phoneInput.setAttribute('aria-invalid', 'true');
    formError.textContent = 'Escribe un celular ecuatoriano válido de 10 dígitos, por ejemplo 0992933619.';
    phoneInput.focus();
    return;
  }
  const invalidMeasure = rows().flatMap((row) => [row.querySelector('[data-field="width"]'), row.querySelector('[data-field="height"]')]).find((input) => !input.value || Number(input.value) < Number(input.min));
  if (invalidMeasure) {
    invalidMeasure.setAttribute('aria-invalid', 'true');
    formError.textContent = 'Revisa las medidas: cada ancho y alto debe ser mayor a 0,20 m.';
    invalidMeasure.focus();
    return;
  }
  nameInput.removeAttribute('aria-invalid');
  emailInput.removeAttribute('aria-invalid');
  phoneInput.removeAttribute('aria-invalid');
  rows().forEach((row) => row.querySelectorAll('[data-field="width"],[data-field="height"]').forEach((input) => input.removeAttribute('aria-invalid')));
  formError.textContent = '';
  const quote = calculate();
  const request = {
    name,
    email,
    phone,
    location: selectedLocation(),
    needs: [...document.querySelectorAll('input[name="needs"]:checked')].map((input) => input.value),
    windows: rows().map(rowData),
    quote: {
      area: quote.area,
      low: quote.low,
      high: quote.high,
      subtotal: quote.subtotal,
      discount: quote.discount,
      installation: quote.installation,
      tax: quote.tax,
      total: quote.total
    }
  };
  const originalLabel = sendButton.innerHTML;
  sendButton.disabled = true;
  sendButton.textContent = 'Enviando cotización...';
  try {
    const response = await fetch('/.netlify/functions/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('No se pudo enviar la cotización.');
  } catch (error) {
    formError.textContent = 'No pudimos enviar el correo. Inténtalo nuevamente.';
    sendButton.disabled = false;
    sendButton.innerHTML = originalLabel;
    return;
  }
  sendButton.textContent = 'Cotización enviada por correo';
});

nameInput.addEventListener('input', () => {
  if (nameInput.value.trim()) {
    nameInput.removeAttribute('aria-invalid');
    formError.textContent = '';
  }
});

emailInput.addEventListener('input', () => {
  if (emailInput.validity.valid && isValidEmail(emailInput.value.trim())) {
    emailInput.removeAttribute('aria-invalid');
    formError.textContent = '';
  }
});

phoneInput.addEventListener('input', () => {
  if (/^09\d{8}$/.test(normalizeEcuadorMobile(phoneInput.value))) {
    phoneInput.removeAttribute('aria-invalid');
    formError.textContent = '';
  }
});

menu.addEventListener('click', () => setMenuOpen(menu.getAttribute('aria-expanded') !== 'true'));
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenuOpen(false); });
window.addEventListener('resize', () => { if (window.innerWidth > 820) setMenuOpen(false); }, { passive: true });

initialWindows.forEach(addWindow);
