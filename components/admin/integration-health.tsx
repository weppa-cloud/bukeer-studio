'use client';

import type { IntegrationStatusDTO } from '@/lib/seo/dto';

/**
 * Integration Health Dashboard
 *
 * Shows a visual status (green/yellow/red) for each of the 4 SEO integrations:
 *   - Google Search Console (essential)
 *   - Google Analytics 4 (essential)
 *   - DataForSEO (optional)
 *   - PageSpeed API (optional — env-flag only, no OAuth)
 *
 * Displays a global badge when all essential integrations are operational.
 * ADR-002: if any integration is not configured, the component renders gracefully
 * without crashing — it just shows the appropriate status.
 *
 * Logging namespace: [seo.scorer] per ADR-010.
 */

type TrafficLight = 'green' | 'yellow' | 'red';

interface IntegrationCard {
  id: string;
  label: string;
  essential: boolean;
  light: TrafficLight;
  statusText: string;
  detail?: string;
}

function trafficLightIcon(light: TrafficLight) {
  if (light === 'green') return '✅';
  if (light === 'yellow') return '⚠️';
  return '❌';
}

function trafficLightClass(light: TrafficLight) {
  if (light === 'green') return 'text-[var(--studio-success)]';
  if (light === 'yellow') return 'text-[var(--studio-warning)]';
  return 'text-[var(--studio-danger)]';
}

function resolveGscLight(gsc: IntegrationStatusDTO['gsc']): TrafficLight {
  if (!gsc.connected) return 'red';
  if (!gsc.configurationComplete) return 'yellow';
  return 'green';
}

function resolveGa4Light(ga4: IntegrationStatusDTO['ga4']): TrafficLight {
  if (!ga4.connected) return 'red';
  if (!ga4.configurationComplete) return 'yellow';
  return 'green';
}

function resolveDataForSeoLight(dataforseo: IntegrationStatusDTO['dataforseo']): TrafficLight {
  if (!dataforseo.connected) return 'red';
  if (!dataforseo.enabled) return 'yellow';
  return 'green';
}

/** PageSpeed API is authenticated via env PAGESPEED_API_KEY — no DB credentials needed. */
function resolvePageSpeedLight(hasApiKey: boolean): TrafficLight {
  return hasApiKey ? 'green' : 'yellow';
}

function buildCards(
  status: IntegrationStatusDTO,
  hasPageSpeedApiKey: boolean
): IntegrationCard[] {
  const gscLight = resolveGscLight(status.gsc);
  const ga4Light = resolveGa4Light(status.ga4);
  const dfsLight = resolveDataForSeoLight(status.dataforseo);
  const psLight = resolvePageSpeedLight(hasPageSpeedApiKey);

  return [
    {
      id: 'gsc',
      label: 'Google Search Console',
      essential: true,
      light: gscLight,
      statusText:
        gscLight === 'green'
          ? 'Conectado y configurado'
          : gscLight === 'yellow'
          ? 'Conectado — falta seleccionar propiedad'
          : 'No conectado',
      detail: status.gsc.siteUrl ? `Site: ${status.gsc.siteUrl}` : status.gsc.lastError ?? undefined,
    },
    {
      id: 'ga4',
      label: 'Google Analytics 4',
      essential: true,
      light: ga4Light,
      statusText:
        ga4Light === 'green'
          ? 'Conectado y configurado'
          : ga4Light === 'yellow'
          ? 'Conectado — falta seleccionar propiedad'
          : 'No conectado',
      detail: status.ga4.propertyId
        ? `Property: ${status.ga4.propertyId}`
        : status.ga4.lastError ?? undefined,
    },
    {
      id: 'dataforseo',
      label: 'DataForSEO',
      essential: false,
      light: dfsLight,
      statusText:
        dfsLight === 'green'
          ? 'Credenciales presentes y habilitado'
          : dfsLight === 'yellow'
          ? 'Credenciales detectadas — no habilitado'
          : 'Sin credenciales (opcional)',
      detail: undefined,
    },
    {
      id: 'pagespeed',
      label: 'PageSpeed API',
      essential: false,
      light: psLight,
      statusText:
        psLight === 'green'
          ? 'API key configurada'
          : 'Sin API key — usando cuota anónima (opcional)',
      detail: undefined,
    },
  ];
}

interface IntegrationHealthProps {
  status: IntegrationStatusDTO;
  /** Pass true when PAGESPEED_API_KEY env var is present (resolved server-side and forwarded as prop). */
  hasPageSpeedApiKey?: boolean;
}

export function IntegrationHealth({ status, hasPageSpeedApiKey = false }: IntegrationHealthProps) {
  const cards = buildCards(status, hasPageSpeedApiKey);

  const essentialCards = cards.filter((c) => c.essential);
  const allEssentialGreen = essentialCards.every((c) => c.light === 'green');

  return (
    <div className="space-y-4">
      {/* Global badge */}
      <div
        className={[
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
          allEssentialGreen
            ? 'bg-[var(--studio-success)]/10 text-[var(--studio-success)] border border-[var(--studio-success)]/30'
            : 'bg-[var(--studio-warning)]/10 text-[var(--studio-warning)] border border-[var(--studio-warning)]/30',
        ].join(' ')}
      >
        {allEssentialGreen ? (
          <>✅ Listo para flujos SEO</>
        ) : (
          <>⚠️ Integraciones esenciales incompletas</>
        )}
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="studio-panel p-4 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={trafficLightClass(card.light)} aria-label={card.light}>
                  {trafficLightIcon(card.light)}
                </span>
                <span className="text-sm font-medium text-[var(--studio-text)]">
                  {card.label}
                </span>
              </div>
              {!card.essential && (
                <span className="text-[10px] text-[var(--studio-text-muted)] uppercase tracking-wide">
                  Opcional
                </span>
              )}
              {card.essential && (
                <span className="text-[10px] text-[var(--studio-text)] uppercase tracking-wide font-semibold">
                  Esencial
                </span>
              )}
            </div>
            <p className={['text-xs', trafficLightClass(card.light)].join(' ')}>
              {card.statusText}
            </p>
            {card.detail && (
              <p className="text-xs text-[var(--studio-text-muted)] truncate">{card.detail}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
