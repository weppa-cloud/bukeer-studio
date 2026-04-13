import { z } from 'zod';
import type { SeoItemType } from '@/lib/seo/unified-scorer';

// ============================================================================
// Request / Response schemas
// ============================================================================

export const seoGenerateRequestSchema = z.object({
  itemType: z.enum(['hotel', 'activity', 'transfer', 'package', 'destination', 'page', 'blog']),
  name: z.string().min(1).max(200),
  slug: z.string().max(200),
  description: z.string().max(5000).optional(),
  existingTitle: z.string().max(200).optional(),
  existingDescription: z.string().max(500).optional(),
  targetKeyword: z.string().max(100).optional(),
  locale: z.string().default('es'),
  context: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    starRating: z.number().optional(),
    duration: z.number().optional(),
    category: z.string().optional(),
    // V2 enrichment
    userRating: z.number().optional(),
    reviewsCount: z.number().optional(),
    // Extended legacy content
    inclusions: z.string().optional(),
    exclusions: z.string().optional(),
    recommendations: z.string().optional(),
    experienceType: z.string().optional(),
    vehicleType: z.string().optional(),
    fromLocation: z.string().optional(),
    toLocation: z.string().optional(),
    destination: z.string().optional(),
    durationDays: z.number().optional(),
    durationNights: z.number().optional(),
    galleryCount: z.number().optional(),
  }).optional(),
});

export type GenerateSeoRequest = z.infer<typeof seoGenerateRequestSchema>;

export const seoGenerateResponseSchema = z.object({
  seoTitle: z.string().describe('SEO title, 50-65 characters ideal'),
  seoDescription: z.string().describe('Meta description, 140-155 characters ideal'),
  targetKeyword: z.string().describe('Target keyword phrase, 2-4 words'),
  reasoning: z.string().describe('Brief explanation of optimization choices in Spanish'),
});

// ============================================================================
// System prompts
// ============================================================================

const BASE_RULES = `
Reglas estrictas:
- Titulo SEO: 50-65 caracteres. Incluye el nombre del item + ubicacion o atributo diferenciador.
- Meta description: 140-155 caracteres. Beneficio principal + 2 atributos + CTA implicito.
- Keyword objetivo: 2-4 palabras, lenguaje natural, intent transaccional o informacional.
- NUNCA inventar datos que no esten en la descripcion proporcionada.
- NUNCA incluir precios ni numeros que no aparezcan en los datos.
- El razonamiento debe ser en espanol, breve (1-2 oraciones).
`.trim();

const TYPE_PROMPTS: Record<SeoItemType, string> = {
  hotel: `Eres un experto en SEO para hoteles y alojamientos en Latinoamerica.
Genera contenido SEO optimizado para un hotel/alojamiento.
Enfocate en: nombre del hotel + ciudad/ubicacion + atributo principal (vista, piscina, centro historico, etc.).
Si hay estrellas, mencionalas. Si hay amenidades destacadas, incluyelas.
${BASE_RULES}`,

  activity: `Eres un experto en SEO para actividades turisticas en Latinoamerica.
Genera contenido SEO optimizado para una actividad o experiencia turistica.
Enfocate en: nombre de la actividad + ubicacion + duracion si aplica.
Usa verbos de accion: "Descubre", "Explora", "Vive".
${BASE_RULES}`,

  transfer: `Eres un experto en SEO para servicios de transporte turistico en Latinoamerica.
Genera contenido SEO optimizado para un servicio de traslado/transporte.
Enfocate en: origen-destino + tipo de vehiculo + comodidad.
${BASE_RULES}`,

  package: `Eres un experto en SEO para paquetes turisticos en Latinoamerica.
Genera contenido SEO optimizado para un paquete de viaje.
Enfocate en: destino principal + duracion + experiencia incluida.
Usa frases como "paquete turistico", "viaje a [destino]", "[X] dias en [destino]".
${BASE_RULES}`,

  destination: `Eres un experto en SEO para destinos turisticos en Latinoamerica.
Genera contenido SEO optimizado para un destino de viaje.
Enfocate en: nombre del destino + atractivos principales + invitacion a explorar.
Usa frases como "viajar a [destino]", "que hacer en [destino]", "guia de [destino]".
${BASE_RULES}`,

  page: `Eres un experto en SEO para paginas web de agencias de viaje.
Genera contenido SEO optimizado para una pagina del sitio web.
Adapta el titulo y la descripcion al contenido de la pagina (nosotros, contacto, servicios, etc.).
${BASE_RULES}`,

  blog: `Eres un experto en SEO para blogs de viaje en Latinoamerica.
Genera contenido SEO optimizado para un articulo del blog.
Enfocate en: tema principal + long-tail keyword + invitacion a leer.
Usa formato informacional: "Guia de...", "Los mejores...", "Como...".
${BASE_RULES}`,
};

export function getSeoSystemPrompt(itemType: SeoItemType, locale: string): string {
  const base = TYPE_PROMPTS[itemType] || TYPE_PROMPTS.page;
  return `${base}\n\nIdioma de salida: ${locale === 'es' ? 'espanol' : locale === 'en' ? 'ingles' : locale === 'pt' ? 'portugues' : locale}.`;
}

// ============================================================================
// User prompt builder
// ============================================================================

export function buildSeoUserPrompt(data: GenerateSeoRequest): string {
  const parts: string[] = [
    `Tipo: ${data.itemType}`,
    `Nombre: ${data.name}`,
    `Slug: ${data.slug}`,
  ];

  if (data.description) {
    parts.push(`Descripcion actual: ${data.description.substring(0, 1000)}`);
  }
  if (data.existingTitle) {
    parts.push(`Titulo SEO actual: ${data.existingTitle}`);
  }
  if (data.existingDescription) {
    parts.push(`Meta description actual: ${data.existingDescription}`);
  }
  if (data.targetKeyword) {
    parts.push(`Keyword actual: ${data.targetKeyword}`);
  }

  if (data.context) {
    const ctx = data.context;
    if (ctx.city) parts.push(`Ciudad: ${ctx.city}`);
    if (ctx.country) parts.push(`Pais: ${ctx.country}`);
    if (ctx.state) parts.push(`Region: ${ctx.state}`);
    if (ctx.amenities?.length) parts.push(`Amenidades: ${ctx.amenities.join(', ')}`);
    if (ctx.starRating) parts.push(`Estrellas: ${ctx.starRating}`);
    if (ctx.userRating) {
      let ratingStr = `Rating: ${ctx.userRating}/5`;
      if (ctx.reviewsCount) ratingStr += ` (${ctx.reviewsCount} reviews)`;
      parts.push(ratingStr);
    }
    if (ctx.duration) parts.push(`Duracion: ${ctx.duration} minutos`);
    if (ctx.durationDays || ctx.durationNights) parts.push(`Duracion: ${ctx.durationDays ?? 0} dias / ${ctx.durationNights ?? 0} noches`);
    if (ctx.category) parts.push(`Categoria: ${ctx.category}`);
    if (ctx.experienceType) parts.push(`Tipo de experiencia: ${ctx.experienceType}`);
    if (ctx.vehicleType) parts.push(`Tipo de vehiculo: ${ctx.vehicleType}`);
    if (ctx.fromLocation || ctx.toLocation) parts.push(`Ruta: ${ctx.fromLocation ?? '—'} → ${ctx.toLocation ?? '—'}`);
    if (ctx.destination) parts.push(`Destino: ${ctx.destination}`);
    if (ctx.inclusions) parts.push(`Incluye: ${ctx.inclusions.substring(0, 500)}`);
    if (ctx.exclusions) parts.push(`No incluye: ${ctx.exclusions.substring(0, 300)}`);
    if (ctx.recommendations) parts.push(`Recomendaciones: ${ctx.recommendations.substring(0, 300)}`);
    if (ctx.galleryCount) parts.push(`Galeria: ${ctx.galleryCount} fotos`);
  }

  parts.push('\nGenera titulo SEO, meta description y keyword objetivo optimizados.');

  return parts.join('\n');
}
