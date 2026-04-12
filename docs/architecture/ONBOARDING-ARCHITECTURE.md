# Guia de Arquitectura para Desarrolladores — bukeer-studio

> Escrita como si un mentor senior te explicara la arquitectura en una sesion 1:1.
> Cada concepto usa codigo real del proyecto. Nada inventado.

**Audiencia:** Desarrollador junior/mid que va a trabajar en bukeer-studio.
**Objetivo:** Que entiendas el *por que* de cada decision, no solo el *como*.

---

## Indice

1. [Que es esto y por que existe](#1-que-es-esto-y-por-que-existe)
2. [El mapa mental: las 4 capas](#2-el-mapa-mental-las-4-capas)
3. [Server Components: la decision mas importante](#3-server-components-la-decision-mas-importante)
4. [Supabase: como hablamos con la base de datos](#4-supabase-como-hablamos-con-la-base-de-datos)
5. [El sistema de temas: design tokens](#5-el-sistema-de-temas-design-tokens)
6. [Como fluyen los datos: de la BD al pixel](#6-como-fluyen-los-datos-de-la-bd-al-pixel)
7. [Estado: donde vive cada tipo de dato](#7-estado-donde-vive-cada-tipo-de-dato)
8. [Errores: la filosofia de "nunca pantalla blanca"](#8-errores-la-filosofia-de-nunca-pantalla-blanca)
9. [Seguridad: las 3 puertas](#9-seguridad-las-3-puertas)
10. [Los paquetes internos: el contrato entre equipos](#10-los-paquetes-internos-el-contrato-entre-equipos)
11. [Validacion con Zod: la unica fuente de verdad](#11-validacion-con-zod-la-unica-fuente-de-verdad)
12. [AI/LLM: como integramos inteligencia artificial](#12-aillm-como-integramos-inteligencia-artificial)
13. [Performance: por que estamos en el edge](#13-performance-por-que-estamos-en-el-edge)
14. [Principios para escalar: como piensa un senior](#14-principios-para-escalar-como-piensa-un-senior)
15. [Checklist antes de hacer un PR](#15-checklist-antes-de-hacer-un-pr)

---

## 1. Que es esto y por que existe

bukeer-studio es el **renderer publico** de sitios web para agencias de turismo. Imagina que una agencia de viajes en Colombia quiere su propia pagina web — ellos la configuran desde una app Flutter (otro repo), y nosotros la mostramos al mundo.

```
Agencia configura su sitio en Flutter (admin)
        |
        v
    Supabase (base de datos compartida)
        |
        v
bukeer-studio lee esa data y renderiza el sitio publico
        |
        v
Turista ve: colombiatours.bukeer.com
```

**Dato clave:** No somos un CMS tradicional. Somos un *renderer multi-tenant* — un solo deploy sirve TODOS los sitios de TODAS las agencias. Cuando alguien visita `colombiatours.bukeer.com`, nuestro middleware detecta el subdominio, busca la data de esa agencia, y renderiza su sitio personalizado.

Esto significa que cada decision de arquitectura tiene que funcionar para 1 agencia y para 1,000.

---

## 2. El mapa mental: las 4 capas

Piensa en la aplicacion como un edificio de 4 pisos. Cada piso tiene una responsabilidad clara:

```
Piso 4: App Router (app/)
   Lo que el usuario ve — paginas, rutas, API endpoints
   "Las habitaciones del edificio"

Piso 3: Presentacion (components/)
   Los bloques de UI reutilizables
   "Los muebles y decoracion"

Piso 2: Logica de aplicacion (lib/)
   Hooks, contextos, permisos, middleware
   "La fontaneria y electricidad"

Piso 1: Dominio e infraestructura (packages/ + lib/supabase)
   Tipos, schemas, conexion a BD
   "Los cimientos"
```

**Regla de oro:** Las dependencias solo fluyen HACIA ABAJO. El piso 4 puede usar el piso 3, pero el piso 1 NUNCA importa del piso 4. Si rompes esta regla, el edificio se vuelve un espagueti imposible de mantener.

### Donde vive cada cosa

```
app/
  site/[subdomain]/    ← sitio publico (lo que ve el turista)
  dashboard/           ← panel de admin (lo que ve la agencia)
  editor/              ← editor visual de secciones
  api/                 ← endpoints de API (AI, quotes, webhooks)

components/
  site/                ← header, footer, barra sticky
  admin/               ← editores de tema, SEO, blog
  editor/              ← UI del editor visual
  ui/                  ← componentes base (shadcn/ui)

lib/
  supabase/            ← conexion a BD (server, browser, middleware)
  admin/               ← permisos, contexto del website
  ai/                  ← integracion LLM (OpenRouter)
  hooks/               ← useAutosave, useOptimisticMutation...
  theme/               ← proveedor de temas M3
  sections/            ← registro y normalizacion de secciones
  seo/                 ← sitemap, robots, JSON-LD

packages/
  theme-sdk/           ← tokens de diseno, compilador de temas
  website-contract/    ← schemas Zod, tipos TypeScript, constantes
```

**Por que importa:** Cuando necesites agregar algo nuevo, ya sabes donde va. Un nuevo componente visual? `components/`. Una nueva query a Supabase? `lib/supabase/`. Un nuevo tipo de dato? `packages/website-contract/`.

---

## 3. Server Components: la decision mas importante

Esta es probablemente la decision arquitectonica mas importante del proyecto. Necesitas entenderla a fondo.

### La idea simple

En React tradicional, todo el codigo se ejecuta en el navegador del usuario. El servidor manda un paquete JavaScript y el navegador lo ejecuta para pintar la pagina.

Con **Server Components** (React 19 / Next.js 15), la mayoria del codigo se ejecuta en el servidor. El servidor genera HTML listo y se lo manda al navegador. El navegador solo ejecuta JavaScript para las partes interactivas (botones, formularios, animaciones).

### Ejemplo real: la pagina publica del sitio

Mira `app/site/[subdomain]/page.tsx`:

```typescript
// Esto es un Server Component (NO tiene 'use client')
// Se ejecuta en el servidor, nunca en el navegador

export default async function SitePage({ params }: SitePageProps) {
  const { subdomain } = await params;

  // Esta query se ejecuta en el servidor — segura, rapida
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound(); // muestra 404
  }

  // Ordena secciones por display_order
  const enabledSections = (website.sections || [])
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <>
      {enabledSections.map((section) => (
        <SectionRenderer key={section.id} section={section} website={website} />
      ))}
    </>
  );
}
```

**Que pasa aqui:**
1. Un turista visita `colombiatours.bukeer.com`
2. El servidor ejecuta esta funcion
3. Llama a Supabase para traer los datos del sitio
4. Renderiza todas las secciones como HTML
5. Manda HTML completo al navegador
6. El navegador NO necesita ejecutar JavaScript para ver la pagina

**Por que es top mundial:**
- **SEO perfecto** — Google recibe HTML completo, no una pagina en blanco que carga con JS
- **Velocidad** — el usuario ve contenido inmediatamente
- **Seguridad** — la clave de Supabase nunca llega al navegador
- **Menos JavaScript** — el bundle del navegador es mas pequeno

### Cuando SI necesitas 'use client'

Solo cuando hay **interactividad**: clicks, inputs, animaciones, estado local.

Mira `components/site/mobile-sticky-bar.tsx`:

```typescript
'use client'; // <-- Esto dice: "ejecuta esto en el navegador"

export function MobileStickyBar({ website }: { website: WebsiteData }) {
  // Necesita 'use client' porque:
  // - Maneja clicks del usuario (botones de WhatsApp, llamar)
  // - Podria necesitar detectar scroll para mostrarse/ocultarse

  const buttons = config?.buttons || [];
  // ...
  return <div className="fixed bottom-0">{/* botones interactivos */}</div>;
}
```

### La regla de los Server Components

> **Si el componente no tiene `onClick`, `onChange`, `useState`, o `useEffect`, es un Server Component. No le pongas `'use client'`.**

Cuando sientas la tentacion de poner `'use client'` en un componente grande, preguntate: "puedo extraer la parte interactiva a un componente hijo mas pequeno?" Casi siempre la respuesta es si.

```
MALO:
'use client'
function PaginaEntera() {
  // 500 lineas de UI + 1 boton con onClick
}

BUENO:
function PaginaEntera() {          // Server Component
  return (
    <div>
      {/* 490 lineas de UI estatica — cero JavaScript */}
      <BotonInteractivo />          {/* solo esto es 'use client' */}
    </div>
  )
}
```

---

## 4. Supabase: como hablamos con la base de datos

Supabase es nuestra base de datos (PostgreSQL) y nuestro sistema de autenticacion. Es el mismo proyecto que usa la app Flutter — compartimos tablas.

### Tres clientes, tres contextos

El error mas comun de un junior es usar el cliente equivocado. Tenemos tres:

```
1. Server Client    → para Server Components y Server Actions
2. Browser Client   → para Client Components ('use client')
3. Middleware Client → solo para el middleware de Next.js
```

**Server Client** (`lib/supabase/server-client.ts`):

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* middleware refreshes session */ }
        },
      },
    }
  );
}
```

**Por que existe:** En el servidor, no hay `localStorage` ni `document.cookie`. Este cliente usa la cookie store de Next.js para manejar sesiones.

**Browser Client** (`lib/supabase/browser-client.ts`):

```typescript
let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient; // singleton — reutiliza la misma instancia

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}
```

**Por que es singleton:** En el navegador, queremos UNA sola conexion. Si crearamos una nueva cada vez que un componente la necesita, tendriamos cientos de conexiones abiertas.

### Patron: las funciones de data

No hacemos queries directamente en los componentes. Tenemos funciones dedicadas en `lib/supabase/`:

```typescript
// lib/supabase/get-website.ts
export async function getWebsiteBySubdomain(
  subdomain: string
): Promise<WebsiteData | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .rpc('get_website_by_subdomain', { p_subdomain: subdomain });

    if (error) {
      console.error('[getWebsiteBySubdomain]', error.message);
      return null; // graceful degradation — nunca throw
    }
    return data;
  } catch (e) {
    console.error('[getWebsiteBySubdomain] unexpected', e);
    return null;
  }
}
```

**Tres cosas importantes aqui:**

1. **RPC en vez de queries directas** — `supabase.rpc()` llama una funcion de PostgreSQL. Es mas eficiente que hacer multiples queries y joins.

2. **Retorna null, nunca throw** — Si la BD falla, no queremos que toda la pagina explote. Retornamos `null` y el componente muestra un fallback.

3. **Logs con namespace** — `[getWebsiteBySubdomain]` nos dice exactamente donde fallo cuando leemos los logs.

---

## 5. El sistema de temas: design tokens

Cada agencia tiene su propia identidad visual: colores, fuentes, estilos. El sistema de temas convierte esa configuracion en CSS que el navegador entiende.

### El flujo completo

```
Agencia elige tema en Flutter
  → Guarda en Supabase: websites.theme = { tokens, profile }
    → bukeer-studio lee ese JSON
      → theme-sdk compila tokens → CSS variables
        → M3ThemeProvider aplica las variables al DOM
          → Todos los componentes usan var(--color-primary) etc.
```

### M3ThemeProvider: el puente

```typescript
// lib/theme/m3-theme-provider.tsx
const M3ThemeContext = createContext<M3ThemeContextType | undefined>(undefined);

export function useM3Theme() {
  const context = useContext(M3ThemeContext);
  if (!context) {
    throw new Error('useM3Theme must be used within M3ThemeProvider');
  }
  return context;
}

// Aplica CSS variables al DOM
function applyCssVariables(vars: CssVariable[], root: HTMLElement) {
  for (const v of vars) {
    root.style.setProperty(`--${v.name}`, v.value);
  }
}
```

**Analogia:** Imagina que los design tokens son una receta de cocina ("usa color rojo #E53935, fuente Playfair Display, esquinas redondeadas de 8px"). El `compileTheme()` es el chef que traduce la receta a platos servidos (CSS variables). El `M3ThemeProvider` es el mesero que lleva los platos a la mesa (el DOM).

### Presets turisticos

Tenemos 8 presets predefinidos:

| Preset | Personalidad | Ejemplo |
|---|---|---|
| `corporate` | Profesional, confiable | Agencia corporativa |
| `luxury` | Elegante, exclusivo | Tours de lujo |
| `adventure` | Energico, audaz | Ecoturismo, deportes |
| `tropical` | Calido, vibrante | Caribe, playa |
| `boutique` | Artesanal, intimo | Experiencias locales |
| `cultural` | Sofisticado, educativo | Tours historicos |
| `eco` | Natural, sostenible | Turismo ecologico |
| `romantic` | Suave, elegante | Luna de miel |

Si la compilacion del tema falla por alguna razon, caemos al preset `corporate` — nunca a un sitio sin estilos.

---

## 6. Como fluyen los datos: de la BD al pixel

Sigamos el viaje completo de un dato, desde que esta en la base de datos hasta que el turista lo ve en pantalla.

### Ejemplo: renderizar el hero de un sitio

```
1. Turista visita colombiatours.bukeer.com

2. Middleware (middleware.ts) detecta subdominio "colombiatours"
   → Reescribe la URL a /site/colombiatours internamente

3. Next.js ejecuta app/site/[subdomain]/page.tsx (Server Component)
   → Llama a getWebsiteBySubdomain('colombiatours')
   → Supabase retorna JSON con toda la data del sitio

4. El Server Component ordena las secciones por display_order
   → La primera seccion es tipo "hero" con titulo, subtitulo, imagen

5. SectionRenderer recibe la seccion
   → Mira section.section_type → es "hero"
   → Renderiza el componente HeroSection con la data

6. HeroSection genera HTML con los textos e imagen
   → Los estilos usan var(--color-primary) del tema de la agencia

7. HTML completo se envia al navegador
   → El turista ve el hero con los colores de Colombian Tours
```

### Diagrama de flujo de datos

```
                    SERVIDOR                          NAVEGADOR
                    ========                          =========

Request llega  ──→  middleware.ts
                      │ detecta subdomain
                      ▼
                    page.tsx (RSC)
                      │ getWebsiteBySubdomain()
                      ▼
                    Supabase ←── query RPC
                      │ retorna WebsiteData
                      ▼
                    SectionRenderer
                      │ mapea section_type → componente
                      ▼
                    HTML generado  ──────────→  Navegador recibe HTML
                                                     │
                                              M3ThemeProvider
                                              aplica CSS vars
                                                     │
                                              Usuario ve el sitio
                                              con colores/fuentes
                                              de la agencia
```

---

## 7. Estado: donde vive cada tipo de dato

Este es un tema que confunde a muchos juniors. "Donde guardo este dato?" La respuesta depende de QUE tipo de dato es.

### La tabla definitiva

| Tipo de dato | Donde vive | Ejemplo | Por que ahi |
|---|---|---|---|
| Contenido del sitio | Servidor (RSC fetch) | Textos, imagenes, secciones | No cambia entre renders |
| Website en edicion | React Context (WebsiteProvider) | El website que el admin esta editando | Multiples componentes lo necesitan |
| Input de formulario | useState local | El texto que el admin escribe | Efimero, solo ese componente |
| Filtros/paginacion | URL searchParams | `?page=2&status=published` | Debe ser compartible y sobrevivir refresh |
| Tema visual | React Context (M3ThemeProvider) | Colores, fuentes de la agencia | Todo el arbol de componentes lo necesita |
| Draft sin guardar | localStorage (useLocalBackup) | Borrador del editor | Debe sobrevivir si el navegador se cierra |

### Por que NO usamos Redux/Zustand

Podrias preguntar: "pero en mi curso de React me ensenaron Redux, por que no lo usan?"

La respuesta corta: **porque la mayoria de nuestros datos viven en el servidor**.

```
Sitio publico:
  100% Server Components → cero estado en el cliente
  No necesitamos Redux para algo que nunca llega al navegador

Dashboard:
  WebsiteProvider (React Context) cubre todo
  No necesitamos una libreria de estado global para un solo contexto

Editor:
  Estado local (useState) + autosave (useAutosave)
  El estado del editor es de una sola pagina, no global
```

Agregar Redux/Zustand significaria mas JavaScript en el bundle (violamos P10), mas complejidad, y cero beneficio real. Si algun dia necesitamos estado compartido entre rutas (ej: colaboracion en tiempo real), Zustand seria la primera opcion — pero ese dia no es hoy.

### useAutosave: un hook que debes entender

Este hook es un buen ejemplo de como manejamos estado complejo sin librerias externas:

```typescript
export function useAutosave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const lastSavedRef = useRef<string>('');

  const save = useCallback(async (dataToSave: T) => {
    const serialized = JSON.stringify(dataToSave);
    if (serialized === lastSavedRef.current) return; // nada cambio

    setStatus('saving');
    try {
      await onSave(dataToSave);
      lastSavedRef.current = serialized;
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [onSave]);

  // Debounce: espera 2 segundos despues del ultimo cambio
  useEffect(() => {
    const timeout = setTimeout(() => save(data), debounceMs);
    return () => clearTimeout(timeout);
  }, [data, debounceMs, save]);

  return { status, saveNow: () => save(data) };
}
```

**Como funciona:**
1. El admin edita algo → `data` cambia
2. El hook espera 2 segundos (debounce) — si el admin sigue escribiendo, reinicia el timer
3. Pasados 2 segundos sin cambios, guarda automaticamente
4. Si falla, marca `status: 'error'` (el UI puede mostrar un aviso)
5. Si `data` no cambio realmente (serialized === lastSaved), no hace nada

---

## 8. Errores: la filosofia de "nunca pantalla blanca"

Un sitio de turismo es la cara de una agencia. Si un turista ve una pantalla blanca, se va. Nunca regresa. Esa primera impresion se pierde para siempre.

### Los 3 niveles de defensa

Imagina un castillo con 3 murallas:

```
Muralla 1: Manejo inline
  "Si esta funcion falla, retorna un valor por defecto"

Muralla 2: Error boundary por ruta (error.tsx)
  "Si algo explota en esta seccion, muestra un fallback con 'reintentar'"

Muralla 3: Error boundary global (global-error.tsx)
  "Si TODO falla, al menos muestra un mensaje decente"
```

### Muralla 1: nunca lanzar excepciones en data fetching

```typescript
// CORRECTO — retorna null, el componente decide que hacer
export async function getWebsiteBySubdomain(subdomain: string): Promise<WebsiteData | null> {
  try {
    const { data, error } = await supabase.rpc('get_website_by_subdomain', { p_subdomain: subdomain });
    if (error) {
      console.error('[getWebsiteBySubdomain]', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('[getWebsiteBySubdomain] unexpected', e);
    return null;
  }
}

// INCORRECTO — un throw sin manejar tumba toda la pagina
export async function getWebsiteBySubdomain(subdomain: string): Promise<WebsiteData> {
  const { data, error } = await supabase.rpc('...');
  if (error) throw new Error(error.message); // BOOM — pantalla blanca
  return data!;
}
```

### Muralla 2: error.tsx por ruta

```typescript
// app/site/[subdomain]/error.tsx
'use client';

export default function SiteError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SiteError]', error);
    // Futuro: Sentry.captureException(error)
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2>Algo salio mal</h2>
      <p>Estamos trabajando para solucionarlo</p>
      <button onClick={reset}>Reintentar</button>
    </div>
  );
}
```

### El patron del fallback

Siempre ten un plan B para todo:

```typescript
// Tema falla → preset corporativo
const theme = compileTheme(tokens, profile) ?? TOURISM_PRESETS.corporate;

// Imagen no carga → placeholder
<Image src={image ?? '/placeholder-destination.jpg'} />

// Secciones vacias → no renderizar nada (no explotar)
if (!sections || sections.length === 0) return null;
```

---

## 9. Seguridad: las 3 puertas

Piensa en la seguridad como tres puertas que un atacante tendria que cruzar:

```
Puerta 1: Middleware (la puerta del edificio)
  → Verifica que tengas llave (cookie de auth)
  → Bloquea subdominios reservados (www, admin, api)
  → Redirige a login si no estas autenticado

Puerta 2: Server Actions / API Routes (la puerta del departamento)
  → Verifica TU identidad especifica (getUser, no getSession)
  → Chequea permisos RBAC (viewer/editor/publisher/owner)
  → Valida el input con Zod
  → Rate limiting en endpoints de AI

Puerta 3: Base de datos RLS (la caja fuerte)
  → Row-Level Security: solo ves datos de TU cuenta
  → Aunque alguien pase las puertas 1 y 2, la BD lo bloquea
```

### La regla de getUser() vs getSession()

Esto es CRITICO y lo vas a ver en code reviews:

```typescript
// CORRECTO — valida el token con el servidor de auth
const { data: { user } } = await supabase.auth.getUser();

// PELIGROSO — confia en el JWT sin revalidar
const { data: { session } } = await supabase.auth.getSession();
// Un atacante podria modificar el JWT y getSession() no lo detectaria
```

**Regla absoluta:** En codigo del servidor, SIEMPRE `getUser()`. `getSession()` solo en el navegador para checks rapidos de UI.

### RBAC: los 4 roles

```
viewer     → Solo puede ver el dashboard, no editar
editor     → Puede crear y editar contenido
publisher  → Puede publicar/despublicar paginas
owner      → Puede todo: usuarios, configuracion, dominios
```

Ejemplo real de verificacion:

```typescript
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = createAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Buscar rol activo del usuario
  const { data: roles } = await supabase
    .from('user_roles')
    .select('account_id, roles(role_name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!roles) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    accountId: roles.account_id,
    role: roleData?.role_name ?? 'agent',
  };
}
```

---

## 10. Los paquetes internos: el contrato entre equipos

Tenemos dos paquetes dentro del proyecto que actuan como "contratos":

```
packages/
  theme-sdk/           ← "Las reglas del diseno"
  website-contract/    ← "Las reglas de los datos"
```

### Por que existen

Imagina que tu y otro desarrollador trabajan en partes diferentes del proyecto. Sin un contrato compartido:

- Tu defines un tipo `Section` con campos A, B, C
- El otro define `Section` con campos A, B, D
- Todo compila, pero en produccion explota porque los campos no coinciden

Los paquetes son ese contrato. Ambos importan del mismo lugar:

```typescript
// Tu componente
import type { WebsiteSection } from '@bukeer/website-contract';

// El componente del otro dev
import type { WebsiteSection } from '@bukeer/website-contract';

// Ambos usan EXACTAMENTE el mismo tipo — imposible que no coincidan
```

### La cadena de dependencias

```
theme-sdk        ← NO importa de nadie (independiente)
    ↓
website-contract ← importa SOLO de theme-sdk
    ↓
Next.js app      ← importa de ambos
```

**Regla:** Las flechas solo van hacia abajo. Si `theme-sdk` necesitara algo de `website-contract`, tendriamos un ciclo y todo se rompe. Esto aplica a tu codigo tambien — nunca importes de `app/` en `lib/` o `packages/`.

### Como se usan en desarrollo

No necesitas compilar los paquetes para desarrollar. Next.js los transpila directamente desde `src/`:

```typescript
// next.config.ts
transpilePackages: ['@bukeer/theme-sdk', '@bukeer/website-contract']

// tsconfig.json — mapea las importaciones al src/
"@bukeer/website-contract": ["./packages/website-contract/src"],
"@bukeer/theme-sdk": ["./packages/theme-sdk/src"]
```

Esto significa: cambias un tipo en `website-contract/src/` → el hot reload lo detecta inmediatamente → ves el resultado sin compilar nada.

---

## 11. Validacion con Zod: la unica fuente de verdad

Zod es la libreria que usamos para validar datos en tiempo de ejecucion. La regla clave:

> **Definir el schema UNA vez. Inferir el tipo TypeScript de ahi. Nunca al reves.**

### Ejemplo real

```typescript
// packages/website-contract/src/schemas/sections.ts

// 1. Definir el schema Zod
export const SectionType = z.enum([
  'hero', 'hero_image', 'hero_video', 'hero_minimal',
  'text', 'rich_text', 'text_image', 'about',
  'features', 'features_grid',
  'testimonials', 'testimonials_carousel',
  'cta', 'newsletter', 'faq', 'faq_accordion',
  'contact', 'blog', 'blog_grid',
]);

// 2. Inferir el tipo — NUNCA declarar manualmente
export type SectionTypeValue = z.infer<typeof SectionType>;
// Resultado: "hero" | "hero_image" | "hero_video" | ... (automatico)

// 3. Validacion con seguridad anti-XSS incluida
export const SafeString = z.string().max(10000).refine(
  (val) => !/<script|javascript:|on\w+\s*=/i.test(val),
  { message: 'Content contains potentially executable code' }
);
```

### Donde validar (y donde NO)

```
API endpoint recibe request  →  VALIDAR con Zod (frontera del sistema)
                                    ↓
Funcion interna procesa data →  NO validar (ya esta limpio)
                                    ↓
Supabase guarda              →  NO validar (la funcion interna lo paso limpio)
```

```typescript
// app/api/quote/route.ts — FRONTERA: si validar
export async function POST(request: Request) {
  const body = await request.json();
  const result = QuoteRequestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.flatten() },
      { status: 400 }
    );
  }

  // A partir de aqui, result.data es seguro y tipado
  await insertQuote(result.data);
}

// lib/supabase/quotes.ts — INTERNO: no validar de nuevo
async function insertQuote(data: QuoteRequest): Promise<void> {
  // 'data' ya fue validado — confiamos en el
  await supabase.from('quote_requests').insert(data);
}
```

**Por que no validar internamente:** Cada validacion tiene un costo (CPU, complejidad). Si ya validamos en la frontera, validar de nuevo dentro es trabajo desperdiciado. Confia en tu propio codigo.

---

## 12. AI/LLM: como integramos inteligencia artificial

El studio tiene un asistente de AI que ayuda a las agencias a generar contenido. Estos son los principios:

### Streaming: nunca buffering

Cuando la AI genera texto, puede tardar 5-30 segundos. Si esperamos a que termine para mostrar algo, el usuario piensa que se colgó.

```
MALO (buffering):
  Usuario presiona "Generar" → [....10 segundos de nada....] → texto completo aparece

BUENO (streaming):
  Usuario presiona "Generar" → "Un" → "Un viaje" → "Un viaje por" → ...fluye palabra por palabra
```

La arquitectura:

```typescript
// app/api/ai/studio-chat/route.ts (servidor)
export async function POST(request: Request) {
  // 1. Verificar auth y rate limit
  // 2. Construir prompt con contexto del website
  // 3. Stream respuesta
  const result = streamText({
    model: openrouter,
    system: systemPrompt,
    messages,
  });
  return result.toDataStreamResponse(); // SSE stream
}

// components/studio/chat.tsx (navegador)
'use client';
import { useChat } from 'ai/react';

function StudioChat({ websiteId }) {
  const { messages, input, handleSubmit, isLoading } = useChat({
    api: '/api/ai/studio-chat',
    body: { websiteId },
  });
  // El hook maneja todo: streaming, estado, re-renders
}
```

### Rate limiting: proteger costos

Cada llamada a la AI cuesta dinero. Sin rate limiting, un usuario podria hacer 1,000 requests y generar una factura enorme:

```
Free:       20 requests/hora
Pro:        100 requests/hora
Enterprise: ilimitado (con budget mensual)
```

### Validar output de la AI

La AI puede inventar cosas (hallucinar). Si le pedimos que genere una seccion JSON, necesitamos validar que el JSON sea correcto ANTES de usarlo:

```typescript
// Pedir output estructurado + validar con Zod
const result = await generateObject({
  model: openrouter,
  schema: SectionConfigSchema, // Zod schema del contrato
  prompt: 'Generate a hero section for a luxury agency...',
});

// Si la AI invento un campo que no existe en el schema,
// Zod lo rechaza automaticamente. Seguridad gratis.
```

---

## 13. Performance: por que estamos en el edge

bukeer-studio se despliega como un **Cloudflare Worker**. Esto significa que nuestro codigo se ejecuta en 300+ data centers alrededor del mundo, no en un solo servidor.

### Que significa para ti

```
Servidor tradicional:
  Turista en Bogota → request viaja a servidor en Virginia → 150ms latencia
  Turista en Madrid → request viaja a servidor en Virginia → 200ms latencia

Cloudflare Workers (edge):
  Turista en Bogota → Worker en Bogota → 10ms latencia
  Turista en Madrid → Worker en Madrid → 10ms latencia
```

### Los limites que debes conocer

| Limite | Valor | Que significa para ti |
|---|---|---|
| Bundle size | 10 MiB | No importes librerias enormes. Usa tree-shaking |
| Memoria | 128 MB | No cargues todo en memoria. Usa streams |
| CPU time | 30 seg | No hagas operaciones pesadas sin streaming |
| Filesystem | No existe | No uses `fs.readFile()`. Usa Supabase Storage |

### Caching: la piramide

```
Nivel 1: CDN de Cloudflare (mas rapido)
  Paginas ISR cacheadas en el edge
  TTFB: ~40ms

Nivel 2: Data Cache de Next.js
  Resultados de queries Supabase cacheados
  Evita ir a la BD en cada request

Nivel 3: Request Memoization
  Deduplicacion dentro de un mismo render
  Si 3 componentes llaman getWebsite(), solo 1 query real

Nivel 4: Router Cache (navegador)
  Prefetch de paginas que el usuario probablemente visitara
  Navegacion instantanea
```

### Optimizacion de bundle

```typescript
// next.config.ts — tree-shake librerias grandes
experimental: {
  optimizePackageImports: [
    'lucide-react',        // solo importa los iconos usados
    'framer-motion',       // solo importa las funciones usadas
    '@radix-ui/react-icons',
  ],
}

// Dynamic import — carga componentes pesados solo cuando se necesitan
const HeavyEditor = dynamic(() => import('./heavy-editor'), {
  loading: () => <Skeleton />,
});
```

---

## 14. Principios para escalar: como piensa un senior

Estos son los patrones mentales que diferencian a un desarrollador que escribe codigo que funciona de uno que escribe codigo que funciona *a escala mundial*.

### 1. "Si funciona para 1, tiene que funcionar para 10,000"

Cada vez que escribas algo, preguntate: "que pasa si hay 10,000 agencias usando esto?"

```typescript
// MALO — carga TODOS los websites en memoria
const allWebsites = await supabase.from('websites').select('*');
const mine = allWebsites.filter(w => w.subdomain === subdomain);

// BUENO — la BD filtra, no tu codigo
const { data } = await supabase
  .from('websites')
  .select('*')
  .eq('subdomain', subdomain)
  .single();
```

### 2. "Los errores no son excepciones, son el caso normal"

En internet, todo falla: la BD, la red, la API de AI, la imagen, el DNS. Escribe codigo que ESPERE el fallo:

```typescript
// Esto NO es pesimismo. Es realismo de produccion.
const website = await getWebsiteBySubdomain(subdomain);
if (!website) return <NotFoundPage />;              // BD fallo o no existe

const theme = compileTheme(website.theme);
if (!theme) theme = CORPORATE_PRESET;                // compilacion fallo

const sections = website.sections ?? [];              // puede no tener secciones
if (sections.length === 0) return <EmptyState />;     // sitio vacio
```

### 3. "Cuanto menos JavaScript mandes al navegador, mejor"

Cada KB de JavaScript tiene un costo triple:
- **Descarga** — mas tiempo para descargar
- **Parseo** — el navegador tiene que interpretar el codigo
- **Ejecucion** — el CPU del movil del turista lo ejecuta

```
Un turista en un pueblo rural de Colombia
con un telefono Android de $100
y 3G lento
no deberia esperar 10 segundos para ver tu pagina.

Server Components resuelven esto:
  El servidor hace el trabajo pesado.
  El telefono solo recibe HTML.
```

### 4. "La complejidad no se elimina, se mueve al lugar correcto"

La complejidad del multi-tenancy, los temas, la AI — todo eso existe. La pregunta es DONDE vive:

```
Complejidad del routing multi-tenant → middleware.ts (un solo lugar)
Complejidad de los temas            → theme-sdk (un paquete aislado)
Complejidad de los tipos            → website-contract (un contrato)
Complejidad de la AI                → lib/ai/ (una carpeta dedicada)

NO esparcida por 50 componentes diferentes.
```

### 5. "Optimiza para leer, no para escribir"

El codigo se escribe una vez y se lee cien veces. Prefiere claridad sobre brevedad:

```typescript
// INTELIGENTE pero ilegible
const s = ws?.s?.filter(x => x.e)?.sort((a,b) => a.o - b.o) ?? [];

// OBVIO y mantenible
const enabledSections = (website.sections || [])
  .filter(section => section.is_enabled)
  .sort((a, b) => a.display_order - b.display_order);
```

### 6. "Cada dependencia es una deuda"

Antes de hacer `npm install cool-library`, preguntate:

- Puedo hacer esto con lo que ya tenemos? (React, Next.js, Tailwind)
- Cuanto pesa? (Estamos en un Worker de 10 MiB)
- Quien lo mantiene? (Un dev solo vs un equipo activo)
- Que pasa si lo abandonan?

```
Necesitas formatear una fecha? → Intl.DateTimeFormat (nativo, 0 KB)
Necesitas un modal?            → shadcn/ui Dialog (ya lo tenemos)
Necesitas estado global?       → React Context (ya lo tenemos)
Necesitas una libreria de graficas de 200KB? → ...piensalo bien
```

---

## 15. Checklist antes de hacer un PR

Usa esta lista antes de abrir un Pull Request. Si alguno falla, tu PR sera rechazado en code review.

### Arquitectura
- [ ] Mi componente es Server Component? Si no, por que necesita `'use client'`?
- [ ] Si use `'use client'`, esta en la hoja mas pequena posible?
- [ ] Las dependencias fluyen hacia abajo? (no importo de `app/` en `lib/`)
- [ ] Use tipos de `@bukeer/website-contract`, no tipos inventados?

### Datos
- [ ] Use el cliente Supabase correcto? (server en RSC, browser en client)
- [ ] Mi data fetch retorna null en error, no throw?
- [ ] Los logs tienen namespace? (`[modulo.funcion]`)
- [ ] Valide input del usuario con Zod en la frontera?

### Seguridad
- [ ] Use `getUser()` en servidor, no `getSession()`?
- [ ] No expuse secrets en variables `NEXT_PUBLIC_`?
- [ ] Valide URLs de usuario antes de hacer fetch server-side?
- [ ] No tengo XSS (uso `SafeString` de website-contract)?

### Performance
- [ ] No aumento el bundle innecesariamente?
- [ ] Use dynamic import para componentes pesados?
- [ ] Mi pagina publica puede ser ISR (no force-dynamic)?
- [ ] No cargo todos los registros en memoria?

### UX
- [ ] Si algo falla, el usuario ve un fallback, no pantalla blanca?
- [ ] Los estados de carga tienen skeleton/spinner?
- [ ] Funciona en movil? (muchos turistas navegan desde el telefono)

---

## Recursos para seguir aprendiendo

| Tema | Recurso |
|---|---|
| React Server Components | [nextjs.org/docs/app/getting-started/server-and-client-components](https://nextjs.org/docs/app/getting-started/server-and-client-components) |
| Supabase SSR | [supabase.com/docs/guides/auth/server-side/nextjs](https://supabase.com/docs/guides/auth/server-side/nextjs) |
| Zod | [zod.dev](https://zod.dev) |
| Tailwind CSS v4 | [tailwindcss.com/docs](https://tailwindcss.com/docs) |
| Cloudflare Workers | [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers) |
| ADRs del proyecto | [docs/architecture/ARCHITECTURE.md](./ARCHITECTURE.md) |

---

> "El mejor codigo no es el mas inteligente. Es el que cualquier dev nuevo entiende en 5 minutos."
> — Tu mentor imaginario de Bukeer
