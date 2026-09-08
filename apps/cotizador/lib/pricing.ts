export const PRODUCTS = {
  screen: { label: 'Screen', rate: 34 },
  blackout: { label: 'Blackout', rate: 34 },
  dimout: { label: 'Dimout', rate: 38 },
  lamina: { label: 'Lámina de protección solar', rate: 34 }
} as const;
export type ProductId = keyof typeof PRODUCTS;
export type QuoteWindow = { room: string; product: ProductId; width: number; height: number };
export const PRICING = {
  discount: 0.4, installation: 172.48, kmRate: 3.5, tax: 0.15,
  variation: 0.06, courtesyArea: 25,
  standard: { minWidth: 0.4, maxWidth: 3, minHeight: 0.4, maxHeight: 3.2 }
} as const;
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function calculateQuote(windows: QuoteWindow[], outsideCity = false, km = 0) {
  const area = windows.reduce((sum, item) => sum + item.width * item.height, 0);
  const subtotal = windows.reduce((sum, item) => sum + item.width * item.height * PRODUCTS[item.product].rate, 0);
  const discount = subtotal * PRICING.discount;
  const installation = PRICING.installation + (outsideCity ? km * PRICING.kmRate : 0);
  const tax = (subtotal - discount + installation) * PRICING.tax;
  const total = subtotal - discount + installation + tax;
  return { area: round(area), subtotal: round(subtotal), discount: round(discount), installation: round(installation), tax: round(tax), total: round(total), low: round(total * (1 - PRICING.variation)), high: round(total * (1 + PRICING.variation)) };
}
export function isSpecial(item: QuoteWindow) {
  const s = PRICING.standard;
  return item.width < s.minWidth || item.width > s.maxWidth || item.height < s.minHeight || item.height > s.maxHeight;
}
export const number = (value: number) => new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
export const currency = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
