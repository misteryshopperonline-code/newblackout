# Campaña: Ya tienes tu casa. Ahora, tus cortinas.

## Alcance y separación

Rama de trabajo: `codex/casa-nueva-cortinas`, creada desde `main`. Solo se modifica el sitio estático: portada, estilos específicos de campaña, contenido del blog y entrada contextual al cotizador. No se modifican CRM, funciones Netlify ni aplicaciones Next.js. No se ha desplegado ni cambiado ningún dominio.

## Qué ofrece hoy

Elección por ambiente → cotización aproximada editable → solicitud por correo mediante el servicio existente → revisión técnica e instalación acordada con el cliente. Los ambientes precargados son ejemplos. El formulario conserva su comportamiento habitual cuando no se accede desde la campaña.

El pago con tarjeta NO está implementado. No se anuncia una compra 100% en línea ni se solicitan datos de tarjeta. La pasarela requiere elección y configuración por parte del negocio; no se copiaron secretos del CRM ni de Next.js.

## Oportunidad y contenido

Público: personas esperando entrega, próximas a mudarse o recién instaladas en una vivienda en Quito/Cumbayá. La etapa habitacional no exige investigar si una persona tiene un préstamo. No solicitar deuda, aprobación hipotecaria, ingresos ni documentos del crédito.

Fuente de contexto, consultada el 8 de septiembre de 2026: https://www.biess.fin.ec/hipotecarios/vivienda-premier. El artículo enlaza directamente a condiciones oficiales sin convertir Blackout en asesor financiero ni insinuar afiliación. No se ofrecen descuentos por pertenecer a un programa público.

Contenido orgánico: `/blog/cortinas-casa-nueva-ecuador.html`, enlazado desde portada y blog e incluido en sitemap. Intenciones: cortinas para casa nueva, cortinas antes de mudarse, cortinas para primera vivienda en Ecuador, cotizar cortinas Quito. La indexabilidad no garantiza indexación ni posicionamiento. Registrar el sitemap en Search Console cuando el negocio confirme el dominio de producción.

Enlaces de entrada:
- `/cotizador/?origen=casa-nueva&ambiente=dormitorio`
- `/cotizador/?origen=casa-nueva&ambiente=sala`
- `/cotizador/?origen=casa-nueva&ambiente=casa`

La selección solo acepta valores conocidos y no almacena datos personales. La solicitud existente añade a `needs` el contexto de casa nueva; no cambia el esquema del CRM. No se instalaron píxeles ni se enviaron datos a plataformas publicitarias.

## Para habilitar una compra con tarjeta real

1. Confirmar pasarela y cuenta comercial, moneda USD, tarjetas aceptadas, costos y modalidad de pago. No compartir secretos por chat: configurarlos en el alojamiento.
2. Definir catálogo vendible: variantes de tejido/color, medidas, límites de fabricación y cobertura. El precio orientativo del cotizador no puede convertirse directamente en un cobro.
3. Aprobar condiciones de medición, instalación, plazos, cambios, cancelación y devolución de productos a medida; separar compra de suscripción comercial.
4. Crear servicio de pedidos y pagos independiente del CRM: precios calculados en servidor, identificador de pedido, sesión de pago alojada por la pasarela, verificación de firma/notificación o consulta servidor a servidor e idempotencia. No aceptar importes del navegador ni marcar pagado por visitar una URL de confirmación.
5. Conservar pedido, importe y estado de pago en almacenamiento persistente. No guardar número de tarjeta ni CVV. Proteger creación de sesiones contra abuso.
6. Probar en sandbox aprobación, rechazo, cancelación, pendientes, reintentos, notificaciones duplicadas y conciliación; confirmar correo de compra y agenda de instalación sin tocar el CRM.
7. Solo tras verificación en producción, reemplazar la advertencia de pago pendiente y lanzar el mensaje de compra en línea. La instalación y cualquier medición presencial deben describirse como tales.

No se configuraron anuncios, cobros ni cambios en servicios externos.
