/**
 * Prompt template for AI package highlights generation.
 *
 * Used by /api/ai/generate-package-content to generate marketing highlights
 * and a narrative description for travel packages.
 */

export interface PackageHighlightsInput {
  name: string;
  destination: string;
  duration_days: number;
  itinerary_summary: string;
  child_products_summary: string;
}

/**
 * Build the prompt for generating package highlights and description.
 *
 * Output contract (enforced by PackageAiHighlightsSchema):
 *   highlights: 3–5 items, max 60 chars each, start with imperative verb
 *   description: 1–2 sentences, narrative, max 200 chars
 *
 * Language: Spanish only.
 * Tone: imperative, emotional, travel marketing.
 */
export function buildPackageHighlightsPrompt(input: PackageHighlightsInput): string {
  return `Eres un experto en marketing de viajes latinoamericano. Genera contenido persuasivo en español para el siguiente paquete turístico.

## Paquete
- **Nombre:** ${input.name}
- **Destino:** ${input.destination}
- **Duración:** ${input.duration_days} días
- **Resumen del itinerario:** ${input.itinerary_summary || 'No disponible'}
- **Servicios incluidos:** ${input.child_products_summary || 'No especificados'}

## Instrucciones

### highlights (array de 3 a 5 elementos)
- Cada highlight debe tener **máximo 60 caracteres**
- Cada highlight debe comenzar con un **verbo en imperativo** en español (ej: Recorre, Disfruta, Descubre, Explora, Vive, Conoce, Admira, Sumérgete)
- Tono: emocional, aspiracional, marketing de viajes
- Destaca experiencias únicas, no características genéricas

### description (string)
- **1 a 2 oraciones** narrativas, máximo 200 caracteres
- Captura la esencia emocional del paquete
- Usa lenguaje evocador y sensorial

## Formato de respuesta
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
\`\`\`json
{
  "highlights": ["<verbo> ...", "...", "..."],
  "description": "..."
}
\`\`\``;
}
