import type { Metadata } from 'next';
import './brand.css';
import './calculator.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Cotizador de persianas a medida | Blackout Ecuador',
  description: 'Calcula el precio aproximado de tus persianas en Quito y Cumbayá. Medidas, materiales y cotización en PDF por correo.',
  alternates: { canonical: '/cotizador' },
  openGraph: { title: 'Cotiza tus persianas | Blackout', description: 'Medidas, materiales y precio aproximado de tus persianas.', locale: 'es_EC', type: 'website' }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-EC"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    {/* Shared by every App Router page; no pages/_document exists in this app. */}
    {/* eslint-disable-next-line @next/next/no-page-custom-font */}
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  </head><body>{children}</body></html>;
}
