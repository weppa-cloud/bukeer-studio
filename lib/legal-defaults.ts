/**
 * Default legal page content for websites that haven't configured custom legal pages.
 * Standard practice for website builders — show placeholder content instead of 404/redirect.
 */

function formatDate(): string {
  return new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getDefaultTermsContent(siteName: string): string {
  const date = formatDate();
  return `<h1>Términos y Condiciones</h1>
<p><em>Última actualización: ${date}</em></p>
<p>Estos términos regulan el uso de este sitio web. Al acceder y utilizar este sitio, aceptas estos términos.</p>
<h2>1. Uso del Sitio</h2>
<p>Este sitio web es operado por ${siteName}. El contenido es de carácter informativo y comercial.</p>
<h2>2. Servicios</h2>
<p>Los servicios de viaje presentados están sujetos a disponibilidad y condiciones específicas de cada proveedor.</p>
<h2>3. Cotizaciones</h2>
<p>Las cotizaciones realizadas a través de este sitio no constituyen una reserva confirmada hasta recibir confirmación por escrito.</p>
<h2>4. Propiedad Intelectual</h2>
<p>Todo el contenido de este sitio es propiedad de ${siteName} o sus proveedores.</p>
<h2>5. Contacto</h2>
<p>Para consultas sobre estos términos, contáctanos a través del formulario del sitio.</p>`;
}

export function getDefaultPrivacyContent(siteName: string): string {
  const date = formatDate();
  return `<h1>Política de Privacidad</h1>
<p><em>Última actualización: ${date}</em></p>
<h2>1. Información que Recopilamos</h2>
<p>Recopilamos información que nos proporcionas voluntariamente al solicitar cotizaciones o contactarnos.</p>
<h2>2. Uso de la Información</h2>
<p>Utilizamos tu información para responder consultas, enviar cotizaciones y mejorar nuestros servicios.</p>
<h2>3. Protección de Datos</h2>
<p>Implementamos medidas de seguridad para proteger tu información personal.</p>
<h2>4. Cookies</h2>
<p>Este sitio utiliza cookies para mejorar la experiencia de navegación.</p>
<h2>5. Contacto</h2>
<p>Para ejercer tus derechos sobre tus datos personales, contáctanos a través del formulario del sitio.</p>`;
}

export function getDefaultCancellationContent(_siteName: string): string {
  const date = formatDate();
  return `<h1>Política de Cancelación</h1>
<p><em>Última actualización: ${date}</em></p>
<p>Las políticas de cancelación varían según el servicio contratado y el proveedor. Consulta las condiciones específicas de cada reserva.</p>
<p>Para solicitar cancelaciones o modificaciones, contáctanos directamente.</p>`;
}

/**
 * Get default legal content by page type.
 */
export function getDefaultLegalContent(
  type: 'terms' | 'privacy' | 'cancellation',
  siteName: string
): string {
  switch (type) {
    case 'terms':
      return getDefaultTermsContent(siteName);
    case 'privacy':
      return getDefaultPrivacyContent(siteName);
    case 'cancellation':
      return getDefaultCancellationContent(siteName);
  }
}
