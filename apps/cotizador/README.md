# Cotizador Blackout · Next.js

Aplicación independiente con Next.js 16 (App Router), React 19 y TypeScript estricto. Conserva el formulario responsive, la regla de medidas y las tarifas del cotizador original. El sitio estático, el blog y el CRM existentes no se modifican.

## Desarrollo local

Requiere Node.js 24 y npm. Desde esta carpeta:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abrir http://localhost:3000/cotizador. El cálculo funciona sin credenciales. El envío por correo requiere configurar uno de los modos siguientes.

```sh
npm run check  # lint, tipos, pruebas y compilación de producción
npm start      # ejecuta la compilación generada por npm run build
```

Desde la raíz del repositorio también existen `npm run dev:cotizador`, `npm run build:cotizador` y `npm run check:cotizador`, después de instalar las dependencias de esta aplicación.

## Despliegue en Vercel

1. Sube el repositorio a tu proveedor Git e impórtalo en Vercel.
2. Selecciona **Root Directory: `apps/cotizador`** y **Framework Preset: Next.js**.
3. Usa **Node.js 24.x**. `vercel.json` define instalación `npm ci` y compilación `npm run build`. Mantén la salida automática de Next.js; no uses exportación estática, porque el envío necesita una función de servidor.
4. Configura las variables de entorno indicadas abajo, por separado para Production y Preview según corresponda.
5. Despliega. La raíz redirige a `/cotizador`; `/cotizador/index.html` también redirige a la nueva ruta.
6. Comprueba el cálculo en móvil y escritorio. Tras verificar el remitente de correo, realiza un envío autorizado a una dirección propia y verifica el PDF. Si utilizas el modo CRM, verifica también que aparezca el prospecto.

No es necesario instalar Vercel CLI ni configurar Netlify para el modo nativo. Este proyecto no cambia automáticamente el dominio ni reemplaza el sitio principal. Para usar el mismo dominio y ruta del sitio actual será necesario configurar su enrutamiento en el alojamiento correspondiente.

### Variables comunes

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL pública de esta aplicación, por ejemplo `https://cotizador.tudominio.com`, sin ruta final. Se usa para canonical, sitemap y robots. En local: `http://localhost:3000`. |
| `NEXT_PUBLIC_MARKETING_URL` | URL del sitio principal, sin barra final. Por defecto `https://blackout.com.ec`. |

Las variables `NEXT_PUBLIC_*` son públicas y se incorporan durante la compilación. Nunca contienen claves. Después de cambiarlas, vuelve a desplegar.

### Modo A: correo y PDF nativos en Vercel

Deja `QUOTE_SERVICE_URL` vacío. Configura:

| Variable | Uso |
| --- | --- |
| `RESEND_API_KEY` | Clave secreta de Resend. |
| `RESEND_FROM_EMAIL` | Remitente de un dominio verificado en Resend. |
| `RESEND_REPLY_TO` | Dirección para respuestas; por defecto `info@blackout.com.ec`. |
| `QUOTE_NOTIFICATION_EMAIL` | Opcional: copia oculta al equipo comercial. |

El servidor genera el PDF y lo envía como adjunto. **Este modo no guarda prospectos en el CRM de Netlify**. Usa el modo B si necesitas mantener ese registro. No se utiliza el disco como almacenamiento persistente.

### Modo B: mantener el CRM y el correo de Netlify

Configura `QUOTE_SERVICE_URL` con la URL HTTPS completa de la función existente `/.netlify/functions/send-quote`. En este modo esa función conserva la responsabilidad del correo, PDF y registro en el CRM; las credenciales Resend permanecen en Netlify. No es necesario duplicarlas en Vercel.

Next.js valida los datos y recalcula los precios antes de enviarlos al servicio. Comprueba que la función Netlify y su almacenamiento sigan activos. La confirmación de envío no garantiza por sí sola la persistencia en el CRM: el servicio heredado gestiona esa operación.

## Arquitectura y tarifas

- `components/calculator.tsx`: formulario interactivo con estado React, validación accesible y precio en tiempo real.
- `lib/pricing.ts`: única tabla de precios y cálculo compartido por cliente y servidor. Screen, Blackout y lámina: USD 34/m²; Dimout: USD 38/m²; descuento 40%; instalación USD 172,48; adicional USD 3,50/km fuera de zona; IVA 15%; rango referencial ±6%.
- `lib/schema.ts`: validación Zod de medidas, productos y contacto. Máximo ocho ventanas.
- `app/api/quotes/route.ts`: API de servidor; ignora totales suministrados por el navegador, limita el cuerpo a 20 KB y aplica tiempos máximos a los proveedores.
- `lib/pdf.ts`: generación del PDF en memoria con PDFKit, en runtime Node.js.
- `tests/quote.test.ts`: regresión de precios, validación y generación de PDF sin enviar correos.

Los precios siguen siendo referenciales. Antes de publicar, confirma con el negocio que las tarifas y las condiciones comerciales siguen vigentes.

## Operación y seguridad

No guardes `.env.local`, claves ni la carpeta `.vercel` en Git. Hay validación de origen y campo antispam, pero no sustituyen un límite de solicitudes: antes de abrir tráfico público, configura rate limiting en Vercel Firewall para `/api/quotes` y revisa los límites de envío de Resend. En el modo B protege también el endpoint de Netlify. No habilites envíos reales en previews no confiables.

La aplicación devuelve un mensaje claro cuando el correo no está configurado, sin simular un envío exitoso. Las pruebas automáticas no envían mensajes ni crean prospectos.

Documentación oficial: [Next.js](https://nextjs.org/docs/app/getting-started/installation) · [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).
