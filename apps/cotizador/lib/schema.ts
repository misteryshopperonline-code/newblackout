import { z } from 'zod';
export const quoteSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre.').max(100),
  email: z.email('Escribe un correo válido.').max(254),
  phone: z.string().transform(value => value.replace(/[\s-]/g, '')).pipe(z.string().regex(/^09\d{8}$/, 'Escribe un celular ecuatoriano de 10 dígitos.')),
  location: z.enum(['Quito', 'Cumbayá', 'Otro sector']),
  locationDetail: z.string().trim().max(150),
  distanceKm: z.number().finite().min(0).max(2000),
  needs: z.array(z.string().max(100)).max(4),
  windows: z.array(z.object({
    room: z.string().trim().min(1, 'Escribe el nombre del ambiente.').max(80),
    product: z.enum(['screen', 'blackout', 'dimout', 'lamina']),
    width: z.number().finite().min(0.2, 'El ancho mínimo es 0,20 m.').max(12, 'El ancho máximo es 12 m.'),
    height: z.number().finite().min(0.2, 'El alto mínimo es 0,20 m.').max(8, 'El alto máximo es 8 m.')
  })).min(1).max(8),
  website: z.string().max(0).optional()
}).refine(data => data.location !== 'Otro sector' || data.locationDetail.length > 0, { message: 'Indica tu ciudad o sector.', path: ['locationDetail'] });
export type QuoteRequest = z.infer<typeof quoteSchema>;
