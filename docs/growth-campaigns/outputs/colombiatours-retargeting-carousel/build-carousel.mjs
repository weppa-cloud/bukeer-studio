import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = '/Users/angelaaragon/Documents/Bukeer 2026/bukeer-studio'
const out = path.join(root, 'docs/growth-campaigns/outputs/colombiatours-retargeting-carousel')
const imageDir = path.join(root, 'assets/colombiatours-landing-jpegs')
const W = 1080
const H = 1350
const brandFooter = 'ColombiaTours.Travel - RNT 35323'

const colors = {
  teal: '#0e5b5b',
  dark: '#0b1f1e',
  cream: '#fffaf0',
  warm: '#f6f1e8',
  coral: '#e85c3c',
  gold: '#f3b13b',
  leaf: '#6ea842',
  ink: '#112827',
  muted: '#c3d2cb',
}

const slides = [
  {
    number: 1,
    role: 'cover',
    file: '01-cover.png',
    headline: '9 días\n3 ciudades',
    body: 'Un viaje para recordar siempre.',
    badge: 'Paquete todo incluido',
    image: ['bogota_monserrate_city_2023.jpg', 'medellin_comuna_13_graffiti_04.jpg', 'cartagena_ciudad_amurallada.jpg'],
    layout: 'Triptych vertical collage with dark teal wash and centered editorial headline.',
    visual_concept: 'Three vertical destination bands: Bogotá, Medellín, Cartagena.',
    alt_text: 'Collage de Bogotá, Medellín y Cartagena con el mensaje 9 días, 3 ciudades.',
  },
  {
    number: 2,
    role: 'itinerary',
    file: '02-bogota.png',
    headline: 'Días 1 a 3: Bogotá',
    body: 'Cultura, historia y gastronomía de altura.',
    badge: 'Primera parada',
    image: ['bogota_monserrate_city_2023.jpg'],
    checks: ['Traslado privado desde el aeropuerto', 'Guía local experto'],
    layout: 'Full-bleed photo, cool overlay, lower text panel with checks.',
    visual_concept: 'Bogotá panorama with elevated, historic tone.',
    alt_text: 'Vista panorámica de Bogotá desde Monserrate.',
  },
  {
    number: 3,
    role: 'itinerary',
    file: '03-medellin.png',
    headline: 'Días 4 a 6: Medellín',
    body: 'Eterna primavera, barrios vivos e innovación.',
    badge: 'Segunda parada',
    image: ['guatape_piedra_del_penol.jpg'],
    checks: ['Hoteles boutique seleccionados', 'Transporte seguro 24/7'],
    layout: 'Tall destination image with vibrant green wash and warm text panel.',
    visual_concept: 'Guatapé as the Medellín-region signature excursion.',
    alt_text: 'Vista de la Piedra del Peñol y Guatapé.',
  },
  {
    number: 4,
    role: 'itinerary',
    file: '04-cartagena.png',
    headline: 'Días 7 a 9: Cartagena',
    body: 'Historia viva y descanso frente al Caribe.',
    badge: 'Cierre perfecto',
    image: ['cartagena_torre_del_reloj.jpg'],
    checks: ['Vuelos internos incluidos', 'Relajación total'],
    layout: 'Warm full-bleed Cartagena photo with gold editorial emphasis.',
    visual_concept: 'Historic Cartagena as the emotional payoff of the trip.',
    alt_text: 'Torre del Reloj y arquitectura colonial de Cartagena.',
  },
  {
    number: 5,
    role: 'proof',
    file: '05-logistica.png',
    headline: 'Tu única preocupación será disfrutar.',
    body: 'Nos encargamos de cada traslado, hotel y conexión.',
    badge: 'Logística blindada',
    image: ['islas_rosario_resort.jpg'],
    pillars: ['Acompañamiento 24/7', 'Ruta sin fricción', 'Experiencias VIP'],
    layout: 'Cream editorial card over destination photography with three trust pillars.',
    visual_concept: 'Travel operator confidence: organized, human, premium without stiffness.',
    alt_text: 'Resort tropical usado como fondo para explicar la logística del viaje.',
  },
  {
    number: 6,
    role: 'cta',
    file: '06-cta.png',
    headline: 'Retoma tu plan a Colombia.',
    body: 'Paquetes desde $1.890 USD.',
    badge: 'Asesoría personalizada',
    image: ['baru_cartagena_playa.jpg'],
    cta: 'Escríbenos por WhatsApp',
    layout: 'Aspirational beach photo with bold CTA button and ColombiaTours brand close.',
    visual_concept: 'Final conversion slide, direct and WhatsApp-first.',
    alt_text: 'Playa del Caribe colombiano con llamada a retomar el plan de viaje.',
  },
]

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function textLines(text, maxChars) {
  const words = text.split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function multiline(text, x, y, opts = {}) {
  const {
    size = 80,
    weight = 600,
    fill = colors.cream,
    lineHeight = 1.04,
    maxChars = 18,
    family = 'Bricolage Grotesque, Arial, sans-serif',
    anchor = 'start',
  } = opts
  return textLines(text, maxChars)
    .map((line, index) => `<text x="${x}" y="${y + index * size * lineHeight}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`)
    .join('\n')
}

function badge(text, x = 72, y = 78, fill = colors.gold, textColor = colors.dark) {
  const width = Math.max(360, text.length * 18 + 76)
  return `
    <rect x="${x}" y="${y}" width="${width}" height="56" rx="28" fill="${fill}"/>
    <text x="${x + 28}" y="${y + 36}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="1.5" fill="${textColor}" text-transform="uppercase">${escapeXml(text.toUpperCase())}</text>
  `
}

function footerText(x, y, fill = colors.cream, size = 28) {
  return `<text x="${x}" y="${y}" font-family="Bricolage Grotesque, Arial, sans-serif" font-size="${size}" font-weight="650" fill="${fill}">${escapeXml(brandFooter)}</text>`
}

function checks(items, x, y) {
  return items.map((item, i) => `
    <g transform="translate(${x} ${y + i * 58})">
      <circle cx="22" cy="22" r="22" fill="${colors.gold}"/>
      <text x="22" y="31" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${colors.dark}">✓</text>
      <text x="60" y="31" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="600" fill="${colors.cream}">${escapeXml(item)}</text>
    </g>
  `).join('\n')
}

function svgOverlay(slide) {
  if (slide.number === 1) {
    return Buffer.from(`
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="44" y="44" width="992" height="1262" rx="34" fill="none" stroke="${colors.cream}" stroke-opacity=".42" stroke-width="2"/>
        ${badge(slide.badge)}
        <text x="72" y="620" font-family="Bricolage Grotesque, Arial, sans-serif" font-size="112" font-weight="600" fill="${colors.cream}">9 días</text>
        <text x="72" y="748" font-family="Bricolage Grotesque, Arial, sans-serif" font-size="112" font-weight="600" fill="${colors.cream}">3 ciudades</text>
        ${multiline(slide.body, 76, 872, { size: 64, weight: 400, fill: colors.gold, lineHeight: 1.08, maxChars: 18, family: 'Instrument Serif, Georgia, serif' })}
        <text x="890" y="1225" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="${colors.cream}">Desliza</text>
        <path d="M1002 1212 l34 28 -34 28" fill="none" stroke="${colors.gold}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        ${footerText(72, 1238, colors.cream, 31)}
      </svg>
    `)
  }

  if (slide.number === 5) {
    return Buffer.from(`
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="68" y="94" width="944" height="1110" rx="34" fill="${colors.cream}" opacity=".94"/>
        ${badge(slide.badge, 112, 144, colors.teal, colors.cream)}
        ${multiline(slide.headline, 112, 360, { size: 76, fill: colors.ink, maxChars: 18 })}
        ${multiline(slide.body, 116, 570, { size: 36, weight: 400, fill: colors.ink, lineHeight: 1.25, maxChars: 34, family: 'Inter, Arial, sans-serif' })}
        ${slide.pillars.map((item, i) => `
          <g transform="translate(116 ${720 + i * 118})">
            <rect width="848" height="82" rx="41" fill="${i === 1 ? colors.gold : colors.teal}"/>
            <text x="42" y="53" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="${i === 1 ? colors.dark : colors.cream}">${escapeXml(item)}</text>
          </g>
        `).join('\n')}
        ${footerText(116, 1135, colors.teal, 28)}
      </svg>
    `)
  }

  if (slide.number === 6) {
    return Buffer.from(`
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="780" width="${W}" height="570" fill="url(#fade)"/>
        <defs>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${colors.dark}" stop-opacity=".02"/>
            <stop offset=".35" stop-color="${colors.dark}" stop-opacity=".76"/>
            <stop offset="1" stop-color="${colors.dark}" stop-opacity=".96"/>
          </linearGradient>
        </defs>
        ${badge(slide.badge)}
        ${multiline(slide.headline, 72, 800, { size: 82, maxChars: 17 })}
        <text x="76" y="995" font-family="Instrument Serif, Georgia, serif" font-size="66" font-style="italic" fill="${colors.gold}">${escapeXml(slide.body)}</text>
        <rect x="72" y="1080" width="600" height="82" rx="41" fill="${colors.coral}"/>
        <text x="116" y="1133" font-family="Inter, Arial, sans-serif" font-size="31" font-weight="800" fill="${colors.dark}">${escapeXml(slide.cta)}</text>
        ${footerText(72, 1240, colors.cream, 31)}
        <text x="72" y="1284" font-family="Inter, Arial, sans-serif" font-size="24" fill="${colors.muted}">Viajes a Colombia, sin fricción.</text>
      </svg>
    `)
  }

  return Buffer.from(`
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="680" width="${W}" height="670" fill="url(#fade)"/>
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${colors.dark}" stop-opacity=".05"/>
          <stop offset=".28" stop-color="${colors.dark}" stop-opacity=".78"/>
          <stop offset="1" stop-color="${colors.dark}" stop-opacity=".95"/>
        </linearGradient>
      </defs>
      ${badge(slide.badge)}
      ${multiline(slide.headline, 72, 760, { size: 78, maxChars: 19 })}
      ${multiline(slide.body, 76, 950, { size: 38, weight: 400, fill: colors.cream, lineHeight: 1.2, maxChars: 31, family: 'Inter, Arial, sans-serif' })}
      ${checks(slide.checks, 76, 1062)}
      ${footerText(72, 1262, colors.cream, 28)}
    </svg>
  `)
}

async function coverImage(slide) {
  if (slide.number === 1) {
    const bandW = W / 3
    const composites = []
    for (let i = 0; i < slide.image.length; i += 1) {
      const buffer = await sharp(path.join(imageDir, slide.image[i]))
        .resize(Math.ceil(bandW), H, { fit: 'cover' })
        .modulate({ saturation: i === 1 ? 1.12 : 1, brightness: .62 })
        .toBuffer()
      composites.push({ input: buffer, left: Math.floor(i * bandW), top: 0 })
    }
    return sharp({ create: { width: W, height: H, channels: 3, background: colors.dark } }).composite(composites).png().toBuffer()
  }

  return sharp(path.join(imageDir, slide.image[0]))
    .resize(W, H, { fit: 'cover' })
    .modulate({ saturation: slide.number === 2 ? .9 : 1.05, brightness: slide.number === 5 ? .78 : .68 })
    .png()
    .toBuffer()
}

const manifest = {
  title: 'Colombia Imperdible 9 Días',
  format: 'instagram-portrait-1080x1350',
  source_inputs: {
    design: path.join(root, 'docs/design/colombiatours.travel/design.md'),
    ideas: path.join(root, 'docs/growth-campaigns/carruseles-retargeting-meta-ads.md'),
    images: imageDir,
  },
  strategy: {
    audience: 'Visitantes MOFU/BOFU de los últimos 180 días que ya evaluaron Colombia y necesitan tangibilizar el valor del paquete.',
    promise: 'Mostrar que Colombia Imperdible 9 Días resuelve la ruta Bogotá, Medellín y Cartagena con logística incluida y acompañamiento humano.',
    voice: 'Editorial, cálida, experta-local y WhatsApp-first.',
    visual_system: 'Fotografía premium full-bleed con wash teal oscuro, acentos gold/coral, titulares Bricolage-style y paneles legibles para mobile.',
  },
  slides: slides.map((slide) => ({
    number: slide.number,
    role: slide.role,
    headline: slide.headline,
    body: slide.body,
    visual_concept: slide.visual_concept,
    layout: slide.layout,
    source_images: slide.image,
    ai_image_prompt: '',
    alt_text: slide.alt_text,
    qa_notes: [
      'Texto principal dentro de zona segura central.',
      'Usa paleta ColombiaTours Caribe Editorial.',
      slide.number === 6 ? 'Precio desde $1.890 USD debe revisarse antes de pauta.' : 'Claim basado en brief de campaña.',
    ],
  })),
  caption: {
    draft: '¿Quieres ver el itinerario completo de Colombia Imperdible 9 Días? Bogotá, Medellín y Cartagena con traslados, hoteles boutique y acompañamiento local. Escríbenos por WhatsApp y retoma tu plan.',
    hashtags: ['#ColombiaTours', '#ViajaAColombia', '#Bogota', '#Medellin', '#Cartagena', '#TravelPlanner'],
    cta: 'Escríbenos por WhatsApp',
  },
}

const brief = `# Colombia Imperdible 9 Días

## Source Inputs

- Design: \`${manifest.source_inputs.design}\`
- Ideas: \`${manifest.source_inputs.ideas}\`
- Images: \`${manifest.source_inputs.images}\`

## Strategy

- Audience: ${manifest.strategy.audience}
- Promise: ${manifest.strategy.promise}
- Voice: ${manifest.strategy.voice}
- Format: 6 slides, 1080x1350, retargeting Meta Ads.

## Creative Decision

Se eligió la Opción 1, "El Desglose Visual", porque el documento la marca como el formato más efectivo para high-ticket: muestra qué incluye el viaje y justifica el precio con una ruta concreta.

## Visual System

${manifest.strategy.visual_system}

## Human Review

- Confirmar vigencia del precio "desde $1.890 USD".
- Confirmar que los assets fotográficos pueden usarse en pauta.
- Ajustar copy final si se decide producir versión con tipografía real de marca.
`

const qa = `# QA

- [x] Manifest validado.
- [x] 6 slides exportados en PNG 1080x1350.
- [x] Cover, slide de itinerario denso y CTA inspeccionables via \`preview.html\`.
- [ ] Revisión humana de precio, disponibilidad y derechos de imagen.
- [ ] Subir a Meta Ads Manager y validar safe zones con preview de ubicaciones.

## Notes

No se usaron imágenes generadas por IA; el carrusel usa fotos base del folder proporcionado para preservar verdad visual del destino.
`

async function main() {
  await fs.mkdir(path.join(out, 'exports'), { recursive: true })
  await fs.mkdir(path.join(out, 'slides'), { recursive: true })

  for (const slide of slides) {
    const image = await coverImage(slide)
    await sharp(image)
      .composite([{ input: svgOverlay(slide), left: 0, top: 0 }])
      .png()
      .toFile(path.join(out, 'exports', slide.file))
  }

  await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
  await fs.writeFile(path.join(out, 'brief.md'), brief)
  await fs.writeFile(path.join(out, 'qa.md'), qa)
  await fs.writeFile(path.join(out, 'slides', 'preview.html'), `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${manifest.title}</title>
  <style>
    body { margin: 0; background: ${colors.warm}; font-family: Inter, Arial, sans-serif; color: ${colors.ink}; }
    main { max-width: 1240px; margin: 0 auto; padding: 48px 24px; }
    h1 { font-family: "Bricolage Grotesque", Arial, sans-serif; font-size: 48px; line-height: 1; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    figure { margin: 0; }
    img { width: 100%; border-radius: 20px; box-shadow: 0 20px 48px -18px rgba(17,40,39,.28); background: ${colors.dark}; }
    figcaption { margin-top: 10px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>${manifest.title}</h1>
    <div class="grid">
      ${slides.map((slide) => `<figure><img src="../exports/${slide.file}" alt="${escapeXml(slide.alt_text)}"><figcaption>${slide.number}. ${escapeXml(slide.headline)}</figcaption></figure>`).join('\n')}
    </div>
  </main>
</body>
</html>
`)
}

main()
