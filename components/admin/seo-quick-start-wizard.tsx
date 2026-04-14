'use client';

import { useState, useEffect } from 'react';
import { StudioBadge, StudioButton, StudioInput } from '@/components/studio/ui/primitives';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface SeoQuickStartWizardProps {
  websiteId: string;
  onComplete: () => void;
  onNavigateToConfig?: () => void;
  gscConnected?: boolean;
}

interface WizardData {
  // Step 2
  businessName: string;
  country: string;
  language: string;
  agencyType: string;
  // Step 3
  keywords: string[];
  // Step 4
  competitor1: string;
  competitor2: string;
  competitor3: string;
  // Step 5 — GSC connected flag (read-only for summary)
  gscConnected: boolean;
  // Step 6
  targetClicks: number;
  targetPosition: number;
  targetTechScore: number;
}

const TOTAL_STEPS = 7;

const COUNTRY_OPTIONS = [
  { value: 'colombia', label: 'Colombia' },
  { value: 'mexico', label: 'México' },
  { value: 'espana', label: 'España' },
  { value: 'argentina', label: 'Argentina' },
  { value: 'peru', label: 'Perú' },
];

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

const AGENCY_TYPE_OPTIONS = [
  { value: 'boutique', label: 'Boutique' },
  { value: 'masiva', label: 'Masiva' },
  { value: 'especializada', label: 'Especializada' },
];

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full h-1.5 bg-[var(--studio-border)] rounded-full overflow-hidden">
      <div
        className="h-full bg-[var(--studio-accent)] rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function KeywordChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--studio-accent)]/10 text-[var(--studio-accent)] border border-[var(--studio-accent)]/20">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-[var(--studio-text)] transition-colors"
        aria-label={`Eliminar ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-[var(--studio-text-muted)] mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 rounded-md border text-sm',
          'bg-[var(--studio-card)] text-[var(--studio-text)]',
          'border-[var(--studio-border)] focus:outline-none focus:border-[var(--studio-accent)]',
          'transition-colors'
        )}
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SeoQuickStartWizard({
  websiteId,
  onComplete,
  onNavigateToConfig,
  gscConnected = false,
}: SeoQuickStartWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [wizardData, setWizardData] = useState<WizardData>({
    businessName: '',
    country: '',
    language: 'es',
    agencyType: '',
    keywords: [],
    competitor1: '',
    competitor2: '',
    competitor3: '',
    gscConnected: false,
    targetClicks: 500,
    targetPosition: 15,
    targetTechScore: 75,
  });

  // Save to localStorage when reaching final step
  useEffect(() => {
    if (currentStep === TOTAL_STEPS) {
      try {
        localStorage.setItem(`seo_wizard_${websiteId}`, JSON.stringify(wizardData));
      } catch {
        // localStorage may not be available
      }
    }
  }, [currentStep, websiteId, wizardData]);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setWizardData((prev) => ({ ...prev, [key]: value }));
  }

  function handleKeywordsKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const raw = keywordsInput.trim().replace(/,$/, '').trim();
      if (raw && !wizardData.keywords.includes(raw)) {
        update('keywords', [...wizardData.keywords, raw]);
      }
      setKeywordsInput('');
    }
  }

  function handleKeywordsBlur() {
    const raw = keywordsInput.trim().replace(/,$/, '').trim();
    if (raw && !wizardData.keywords.includes(raw)) {
      update('keywords', [...wizardData.keywords, raw]);
      setKeywordsInput('');
    }
  }

  function removeKeyword(kw: string) {
    update('keywords', wizardData.keywords.filter((k) => k !== kw));
  }

  function isNextDisabled(): boolean {
    if (currentStep === 2) {
      return !wizardData.businessName.trim() || !wizardData.country || !wizardData.agencyType;
    }
    if (currentStep === 3) {
      return wizardData.keywords.length === 0;
    }
    return false;
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS) setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  function handleNavigateToConfig() {
    if (onNavigateToConfig) {
      onNavigateToConfig();
    } else {
      router.push(`?tab=config`);
    }
    onComplete();
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-4">
            <div className="text-5xl">🚀</div>
            <h2 className="text-2xl font-bold text-[var(--studio-text)]">
              ¡Configura tu SEO en 5 minutos!
            </h2>
            <p className="text-sm text-[var(--studio-text-muted)] max-w-sm mx-auto">
              Te guiaremos paso a paso para configurar tus palabras clave principales, conectar
              Google Search Console y establecer objetivos de crecimiento para tu agencia.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-left">
              {[
                { icon: '🔑', text: 'Palabras clave estratégicas' },
                { icon: '📊', text: 'Conexión con Google' },
                { icon: '🎯', text: 'OKRs de 90 días' },
              ].map((item) => (
                <div
                  key={item.text}
                  className="studio-card p-3 flex items-center gap-2 text-sm text-[var(--studio-text)]"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--studio-text)]">
                Información básica
              </h2>
              <p className="text-sm text-[var(--studio-text-muted)] mt-1">
                Cuéntanos sobre tu negocio para personalizar las recomendaciones SEO.
              </p>
            </div>
            <div>
              <label className="block text-xs text-[var(--studio-text-muted)] mb-1">
                Nombre del negocio <span className="text-[var(--studio-danger)]">*</span>
              </label>
              <StudioInput
                value={wizardData.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder="Ej: Colombia Tours Boutique"
              />
            </div>
            <SelectField
              label="País principal *"
              value={wizardData.country}
              onChange={(v) => update('country', v)}
              options={COUNTRY_OPTIONS}
            />
            <SelectField
              label="Idioma"
              value={wizardData.language}
              onChange={(v) => update('language', v)}
              options={LANGUAGE_OPTIONS}
            />
            <SelectField
              label="Tipo de agencia *"
              value={wizardData.agencyType}
              onChange={(v) => update('agencyType', v)}
              options={AGENCY_TYPE_OPTIONS}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--studio-text)]">
                Palabras clave principales
              </h2>
              <p className="text-sm text-[var(--studio-text-muted)] mt-1">
                Ingresa los términos que definen tu oferta turística.
              </p>
            </div>
            <div>
              <label className="block text-xs text-[var(--studio-text-muted)] mb-1">
                Escribe 3-5 palabras clave principales separadas por comas{' '}
                <span className="text-[var(--studio-danger)]">*</span>
              </label>
              <textarea
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                onKeyDown={handleKeywordsKeyDown}
                onBlur={handleKeywordsBlur}
                placeholder="tours colombia, paquetes ecoturismo, viajes sierra nevada"
                rows={3}
                className={cn(
                  'w-full px-3 py-2 rounded-md border text-sm resize-none',
                  'bg-[var(--studio-card)] text-[var(--studio-text)]',
                  'border-[var(--studio-border)] focus:outline-none focus:border-[var(--studio-accent)]',
                  'transition-colors placeholder:text-[var(--studio-text-muted)]'
                )}
              />
              <p className="text-xs text-[var(--studio-text-muted)] mt-1">
                Tip: usa términos que tus clientes buscarían en Google
              </p>
            </div>
            {wizardData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {wizardData.keywords.map((kw) => (
                  <KeywordChip key={kw} label={kw} onRemove={() => removeKeyword(kw)} />
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--studio-text)]">Competidores</h2>
              <p className="text-sm text-[var(--studio-text-muted)] mt-1">
                Ingresa los dominios de tus competidores principales para monitorearlos.
              </p>
            </div>
            {(['competitor1', 'competitor2', 'competitor3'] as const).map((field, i) => (
              <div key={field}>
                <label className="block text-xs text-[var(--studio-text-muted)] mb-1">
                  Competidor {i + 1}{' '}
                  <span className="text-[var(--studio-text-muted)]">(opcional)</span>
                </label>
                <StudioInput
                  value={wizardData[field]}
                  onChange={(e) => update(field, e.target.value)}
                  placeholder="micompetidor.com"
                  type="text"
                />
              </div>
            ))}
            <p className="text-xs text-[var(--studio-text-muted)]">
              Puedes completar esto después.
            </p>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--studio-text)]">
                Conectar Google Search Console
              </h2>
              <p className="text-sm text-[var(--studio-text-muted)] mt-1">
                GSC permite ver clicks, impresiones y posición real de tus keywords.
              </p>
            </div>
            <div className="studio-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <p className="text-sm font-medium text-[var(--studio-text)]">
                  Google Search Console
                </p>
                <StudioBadge tone={gscConnected ? 'success' : 'warning'}>
                  {gscConnected ? 'Conectado' : 'No conectado'}
                </StudioBadge>
              </div>
              <p className="text-xs text-[var(--studio-text-muted)]">
                {gscConnected
                  ? 'GSC está conectado. Los datos de búsqueda ya se importan automáticamente.'
                  : 'Conecta tu cuenta de Google para importar datos de búsqueda reales directamente a tu panel de Analytics.'}
              </p>
              {!gscConnected && (
                <StudioButton size="sm" onClick={handleNavigateToConfig}>
                  Conectar GSC →
                </StudioButton>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              className="text-xs text-[var(--studio-text-muted)] underline hover:text-[var(--studio-text)] transition-colors"
            >
              Omitir por ahora
            </button>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--studio-text)]">
                Objetivos 90 días
              </h2>
              <p className="text-sm text-[var(--studio-text-muted)] mt-1">
                Estos OKRs aparecerán en tu panel de Analytics para medir tu progreso.
              </p>
            </div>
            <div>
              <label className="block text-xs text-[var(--studio-text-muted)] mb-1">
                Clicks orgánicos mensuales meta
              </label>
              <StudioInput
                type="number"
                value={String(wizardData.targetClicks)}
                onChange={(e) => update('targetClicks', Number(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--studio-text-muted)] mb-1">
                Posición promedio meta
              </label>
              <StudioInput
                type="number"
                value={String(wizardData.targetPosition)}
                onChange={(e) => update('targetPosition', Number(e.target.value) || 0)}
                min={1}
                max={100}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--studio-text-muted)] mb-1">
                Score técnico meta
              </label>
              <StudioInput
                type="number"
                value={String(wizardData.targetTechScore)}
                onChange={(e) => update('targetTechScore', Number(e.target.value) || 0)}
                min={0}
                max={100}
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">✅</div>
              <h2 className="text-2xl font-bold text-[var(--studio-text)]">
                Tu SEO está configurado
              </h2>
              <p className="text-sm text-[var(--studio-text-muted)]">
                Aquí está un resumen de lo que configuraste:
              </p>
            </div>

            <div className="studio-card p-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-[var(--studio-text-muted)] mb-1">Negocio</p>
                <p className="text-[var(--studio-text)] font-medium">
                  {wizardData.businessName || '—'}
                  {wizardData.country
                    ? ` · ${COUNTRY_OPTIONS.find((c) => c.value === wizardData.country)?.label ?? wizardData.country}`
                    : ''}
                  {wizardData.agencyType
                    ? ` · ${AGENCY_TYPE_OPTIONS.find((a) => a.value === wizardData.agencyType)?.label ?? wizardData.agencyType}`
                    : ''}
                </p>
              </div>
              {wizardData.keywords.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--studio-text-muted)] mb-1">
                    Palabras clave ({wizardData.keywords.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {wizardData.keywords.map((kw) => (
                      <StudioBadge key={kw} tone="info">
                        {kw}
                      </StudioBadge>
                    ))}
                  </div>
                </div>
              )}
              {(wizardData.competitor1 || wizardData.competitor2 || wizardData.competitor3) && (
                <div>
                  <p className="text-xs text-[var(--studio-text-muted)] mb-1">Competidores</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[wizardData.competitor1, wizardData.competitor2, wizardData.competitor3]
                      .filter(Boolean)
                      .map((c) => (
                        <StudioBadge key={c} tone="neutral">
                          {c}
                        </StudioBadge>
                      ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-[var(--studio-text-muted)] mb-1">OKRs 90 días</p>
                <div className="flex flex-wrap gap-2">
                  <StudioBadge tone="success">{wizardData.targetClicks} clicks/mes</StudioBadge>
                  <StudioBadge tone="success">Posición ≤{wizardData.targetPosition}</StudioBadge>
                  <StudioBadge tone="success">Score {wizardData.targetTechScore}+</StudioBadge>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <StudioButton
                onClick={() => {
                  router.push(`?tab=overview`);
                  onComplete();
                }}
              >
                Ver Analytics →
              </StudioButton>
              <StudioButton
                variant="outline"
                onClick={() => {
                  router.push(`../contenido`);
                  onComplete();
                }}
              >
                Ver Contenido →
              </StudioButton>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={cn(
          'relative w-full max-w-lg rounded-xl border border-[var(--studio-border)]',
          'bg-[var(--studio-card)] shadow-2xl',
          'flex flex-col max-h-[90vh]'
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--studio-border)] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--studio-text-muted)]">
              Paso {currentStep} de {TOTAL_STEPS}
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] transition-colors text-lg leading-none"
              aria-label="Cerrar asistente"
            >
              ×
            </button>
          </div>
          <ProgressBar current={currentStep} total={TOTAL_STEPS} />
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1">{renderStep()}</div>

        {/* Footer */}
        {currentStep < TOTAL_STEPS && (
          <div className="px-6 pb-6 pt-4 border-t border-[var(--studio-border)] shrink-0 flex items-center justify-between">
            {currentStep > 1 ? (
              <StudioButton variant="outline" size="sm" onClick={handleBack}>
                ← Anterior
              </StudioButton>
            ) : (
              <div />
            )}

            {currentStep === 1 ? (
              <StudioButton size="sm" onClick={handleNext}>
                Comenzar →
              </StudioButton>
            ) : currentStep === 4 || currentStep === 5 ? (
              <StudioButton size="sm" onClick={handleNext} disabled={isNextDisabled()}>
                Siguiente →
              </StudioButton>
            ) : (
              <StudioButton size="sm" onClick={handleNext} disabled={isNextDisabled()}>
                Siguiente →
              </StudioButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
