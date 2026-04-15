'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface QuoteFormProps {
  productType: string;
  productId: string;
  productName: string;
  productDestination?: string;
  whatsappNumber?: string;
  className?: string;
}

interface FormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  notes: string;
}

export function QuoteForm({
  productType,
  productId,
  productName,
  productDestination,
  whatsappNumber,
  className = '',
}: QuoteFormProps) {
  const params = useParams<{ subdomain: string }>();
  const searchParams = useSearchParams();
  const subdomain = params?.subdomain ?? '';

  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'adults' || name === 'children' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          productType,
          productId,
          productName,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone || undefined,
          travelDates:
            formData.checkIn || formData.checkOut
              ? {
                  checkIn: formData.checkIn || undefined,
                  checkOut: formData.checkOut || undefined,
                }
              : undefined,
          adults: formData.adults,
          children: formData.children,
          notes: formData.notes || undefined,
          utmSource: searchParams?.get('utm_source') || undefined,
          utmMedium: searchParams?.get('utm_medium') || undefined,
          utmCampaign: searchParams?.get('utm_campaign') || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          checkIn: '',
          checkOut: '',
          adults: 2,
          children: 0,
          notes: '',
        });
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.error || 'Error al enviar la solicitud');
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    if (!whatsappNumber) return;

    const dateRange =
      formData.checkIn && formData.checkOut
        ? `📅 Fechas: ${formatDate(formData.checkIn)} - ${formatDate(formData.checkOut)}`
        : formData.checkIn
          ? `📅 Fecha: ${formatDate(formData.checkIn)}`
          : '';

    const travelers = `👥 Viajeros: ${formData.adults} adulto${formData.adults !== 1 ? 's' : ''}${formData.children > 0 ? `, ${formData.children} niño${formData.children !== 1 ? 's' : ''}` : ''}`;

    const message = `¡Hola! 👋

Estoy interesado en cotizar:

🌴 *${productName}*${productDestination ? `\n📍 Destino: ${productDestination}` : ''}
${dateRange}
${travelers}
${formData.notes ? `\n💬 Notas: ${formData.notes}` : ''}

*Mis datos:*
👤 ${formData.customerName}
📧 ${formData.customerEmail}${formData.customerPhone ? `\n📱 ${formData.customerPhone}` : ''}

¡Gracias!`;

    const encodedMessage = encodeURIComponent(message);
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isFormValid =
    formData.customerName.trim() !== '' &&
    formData.customerEmail.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail);

  if (submitStatus === 'success') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-xl p-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-green-800 mb-2">¡Solicitud Enviada!</h3>
        <p className="text-green-700 mb-4">
          Hemos recibido tu solicitud de cotización. Te contactaremos pronto.
        </p>
        <button
          onClick={() => setSubmitStatus('idle')}
          className="text-green-600 hover:text-green-800 font-medium"
        >
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-background rounded-xl shadow-lg p-6 ${className}`}>
      <h3 className="text-xl font-semibold mb-6">Solicitar Cotización</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Info (readonly) */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground">Producto seleccionado:</p>
          <p className="font-medium">{productName}</p>
        </div>

        {/* Personal Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label htmlFor="customerEmail" className="block text-sm font-medium mb-1">
              Email *
            </label>
            <input
              type="email"
              id="customerEmail"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="customerPhone" className="block text-sm font-medium mb-1">
            Teléfono / WhatsApp
          </label>
          <input
            type="tel"
            id="customerPhone"
            name="customerPhone"
            value={formData.customerPhone}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="+57 300 123 4567"
          />
        </div>

        {/* Travel Dates */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="checkIn" className="block text-sm font-medium mb-1">
              Fecha de llegada
            </label>
            <input
              type="date"
              id="checkIn"
              name="checkIn"
              value={formData.checkIn}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="checkOut" className="block text-sm font-medium mb-1">
              Fecha de salida
            </label>
            <input
              type="date"
              id="checkOut"
              name="checkOut"
              value={formData.checkOut}
              onChange={handleChange}
              min={formData.checkIn || new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Travelers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="adults" className="block text-sm font-medium mb-1">
              Adultos
            </label>
            <select
              id="adults"
              name="adults"
              value={formData.adults}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n} adulto{n !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="children" className="block text-sm font-medium mb-1">
              Niños
            </label>
            <select
              id="children"
              name="children"
              value={formData.children}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} niño{n !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Comentarios adicionales
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="¿Alguna preferencia o solicitud especial?"
          />
        </div>

        {/* Error message */}
        {submitStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex-1 bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Enviando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Solicitar Cotización
              </>
            )}
          </button>

          {whatsappNumber && (
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={!isFormValid}
              className="flex-1 bg-[#25D366] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#22c55e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviar por WhatsApp
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Al enviar, aceptas que te contactemos para responder tu solicitud.
        </p>
      </form>
    </div>
  );
}
