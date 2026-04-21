'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnalyticsOverviewDTO } from '@/lib/seo/dto';
import { StudioBadge, StudioButton } from '@/components/studio/ui/primitives';

interface SeoOkrCycleProps {
  websiteId: string;
  overview?: AnalyticsOverviewDTO | null;
}

interface WeeklyTaskRow {
  id: string;
  websiteId: string;
  weekOf: string;
  taskType: 'striking_distance' | 'low_ctr' | 'drift' | 'cannibalization' | 'custom';
  priority: 'P1' | 'P2' | 'P3';
  title: string;
  description?: string | null;
  sourceData?: Record<string, unknown>;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'skipped';
}

interface OkrTargets {
  clicks: number;
  position: number;
  score: number;
}

function startOfIsoWeek(input?: Date): string {
  const base = input ?? new Date();
  const utcDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const weekday = utcDate.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  return utcDate.toISOString().slice(0, 10);
}

function taskTypeLabel(taskType: WeeklyTaskRow['taskType']) {
  switch (taskType) {
    case 'striking_distance':
      return 'Striking Distance';
    case 'low_ctr':
      return 'Low CTR';
    case 'drift':
      return 'Drift';
    case 'cannibalization':
      return 'Canibalización';
    case 'custom':
    default:
      return 'Custom';
  }
}

function taskMeta(task: WeeklyTaskRow) {
  const source = task.sourceData ?? {};
  if (task.taskType === 'striking_distance') {
    const position = source.position;
    const volume = source.searchVolume;
    if (typeof position === 'number' || typeof volume === 'number') {
      return `Meta: top 10 · pos ${position ?? '-'} · vol ${volume ?? '-'}`;
    }
  }
  if (task.taskType === 'low_ctr') {
    const ctr = source.ctr28d;
    const impressions = source.impressions28d;
    if (typeof ctr === 'number' || typeof impressions === 'number') {
      const pct = typeof ctr === 'number' ? `${(ctr * 100).toFixed(2)}%` : '-';
      return `Meta: CTR > 2% · actual ${pct} · imp ${impressions ?? '-'}`;
    }
  }
  if (task.taskType === 'drift') {
    const decay = source.decayDeltaPct;
    if (typeof decay === 'number') {
      return `Meta: recuperar tráfico · delta ${decay.toFixed(2)}%`;
    }
  }
  return `Meta: ${taskTypeLabel(task.taskType)}`;
}

// ─── Ciclo 7D ────────────────────────────────────────────────────────────────

function Ciclo7D({ websiteId }: { websiteId: string }) {
  const weekOf = useMemo(() => startOfIsoWeek(), []);
  const [tasks, setTasks] = useState<WeeklyTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        websiteId,
        weekOf,
        limit: '50',
      });
      const response = await fetch(`/api/seo/weekly-tasks?${params.toString()}`, {
        cache: 'no-store',
      });

      const json = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            data?: { rows?: WeeklyTaskRow[] };
            error?: { message?: string };
          }
        | null;

      if (!response.ok || !json?.success) {
        throw new Error(json?.error?.message ?? 'No se pudieron cargar las tareas semanales.');
      }

      setTasks(json.data?.rows ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las tareas semanales.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId, weekOf]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/seo/weekly-tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, weekOf }),
      });

      const json = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: { message?: string };
          }
        | null;

      if (!response.ok || !json?.success) {
        throw new Error(json?.error?.message ?? 'No se pudieron generar tareas semanales.');
      }

      await loadTasks();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'No se pudieron generar tareas semanales.');
    } finally {
      setGenerating(false);
    }
  }

  async function toggle(task: WeeklyTaskRow) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    setUpdatingId(task.id);
    setError(null);

    try {
      const response = await fetch(`/api/seo/weekly-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: { message?: string };
          }
        | null;

      if (!response.ok || !json?.success) {
        throw new Error(json?.error?.message ?? 'No se pudo actualizar la tarea.');
      }

      setTasks((prev) =>
        prev.map((row) =>
          row.id === task.id
            ? {
                ...row,
                status: nextStatus,
              }
            : row,
        ),
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'No se pudo actualizar la tarea.');
    } finally {
      setUpdatingId(null);
    }
  }

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const total = tasks.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="studio-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">⚡</span>
        <div>
          <p className="text-sm font-semibold text-[var(--studio-text)]">Ciclo 7D</p>
          <p className="text-xs text-[var(--studio-text-muted)]">Esta semana · Quick Wins</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StudioBadge tone={total > 0 && doneCount === total ? 'success' : 'neutral'}>
            {doneCount}/{total}
          </StudioBadge>
          <StudioButton
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generating || loading}
          >
            {generating ? 'Generando...' : 'Generar'}
          </StudioButton>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--studio-text-muted)]">Cargando tareas semanales...</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-[var(--studio-text-muted)]">
          Sin tareas generadas para {weekOf}. Usa &quot;Generar&quot; para crear el plan semanal.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const checked = task.status === 'done';
            return (
              <label
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-md border border-[var(--studio-border)] cursor-pointer hover:border-[var(--studio-accent)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => void toggle(task)}
                  disabled={updatingId === task.id}
                  className="mt-0.5 accent-[var(--studio-accent)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs font-medium transition-colors ${
                        checked
                          ? 'line-through text-[var(--studio-text-muted)]'
                          : 'text-[var(--studio-text)]'
                      }`}
                    >
                      {task.title}
                    </p>
                    <StudioBadge tone={task.priority === 'P1' ? 'danger' : task.priority === 'P2' ? 'warning' : 'neutral'}>
                      {task.priority}
                    </StudioBadge>
                  </div>
                  <p className="text-[11px] text-[var(--studio-text-muted)] mt-0.5">{taskMeta(task)}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--studio-danger)]">{error}</p>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--studio-text-muted)]">Progreso semanal</span>
          <span className="text-xs font-medium text-[var(--studio-text)]">{progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--studio-border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--studio-accent)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Ciclo 30D ───────────────────────────────────────────────────────────────

interface OkrRow {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  lowerIsBetter?: boolean;
}

function buildOkrRows(
  overview: AnalyticsOverviewDTO | null | undefined,
  targets: OkrTargets | null,
): OkrRow[] {
  return [
    {
      id: 'clicks',
      label: 'Clicks orgánicos',
      current: overview?.sessions ?? 0,
      target: targets?.clicks ?? 500,
      unit: 'clicks/mes',
    },
    {
      id: 'position',
      label: 'Posición promedio',
      current: 0,
      target: targets?.position ?? 15,
      unit: 'pos avg',
      lowerIsBetter: true,
    },
    {
      id: 'score',
      label: 'Score técnico',
      current: 0,
      target: targets?.score ?? 75,
      unit: '/100',
    },
  ];
}

function OkrProgressBar({ current, target, lowerIsBetter }: { current: number; target: number; lowerIsBetter?: boolean }) {
  const pct = target <= 0 ? 0 : Math.min(100, Math.round((current / target) * 100));
  const effectivePct = lowerIsBetter
    ? current === 0
      ? 0
      : Math.min(100, Math.round((target / current) * 100))
    : pct;
  const good = effectivePct >= 80;
  const mid = effectivePct >= 40;

  return (
    <div className="h-1.5 rounded-full bg-[var(--studio-border)] overflow-hidden mt-1">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          good ? 'bg-green-500' : mid ? 'bg-yellow-500' : 'bg-[var(--studio-accent)]'
        }`}
        style={{ width: `${effectivePct}%` }}
      />
    </div>
  );
}

function Ciclo30D({ overview, targets }: { overview?: AnalyticsOverviewDTO | null; targets: OkrTargets | null }) {
  const rows = buildOkrRows(overview, targets);

  return (
    <div className="studio-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">📈</span>
        <div>
          <p className="text-sm font-semibold text-[var(--studio-text)]">Ciclo 30D</p>
          <p className="text-xs text-[var(--studio-text-muted)]">Este mes · Goals</p>
        </div>
        <div className="ml-auto">
          <StudioBadge tone="info">OKRs</StudioBadge>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const displayCurrent = row.current;
          const displayTarget = row.target;
          return (
            <div key={row.id} className="p-3 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg)]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-[var(--studio-text)]">{row.label}</p>
                <span className="text-xs text-[var(--studio-text-muted)]">
                  {displayCurrent} / {displayTarget}{' '}
                  <span className="text-[10px]">{row.unit}</span>
                </span>
              </div>
              <OkrProgressBar
                current={displayCurrent}
                target={displayTarget}
                lowerIsBetter={row.lowerIsBetter}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ciclo 90D ───────────────────────────────────────────────────────────────

interface ObjectiveKpi {
  label: string;
  from: number;
  to: number;
}

interface ObjectiveCard {
  id: string;
  title: string;
  kpis: ObjectiveKpi[];
}

interface Objective90dRow {
  id: string;
  title: string;
  description?: string | null;
  quarter: string;
  status: 'active' | 'completed' | 'paused';
  kpis: Array<Record<string, unknown>>;
}

function currentQuarter(input?: Date): string {
  const base = input ?? new Date();
  const year = base.getUTCFullYear();
  const quarter = Math.floor(base.getUTCMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapObjectiveKpis(raw: Array<Record<string, unknown>>): ObjectiveKpi[] {
  return raw
    .map((entry, index) => {
      const label =
        typeof entry.label === 'string'
          ? entry.label
          : typeof entry.name === 'string'
            ? entry.name
            : typeof entry.key === 'string'
              ? entry.key
              : `KPI ${index + 1}`;
      const from = toFiniteNumber(entry.from ?? entry.current ?? entry.start) ?? 0;
      const to = toFiniteNumber(entry.to ?? entry.target ?? entry.goal) ?? 0;
      return { label, from, to };
    })
    .filter((kpi) => kpi.label.length > 0);
}

function mapObjectiveToCard(row: Objective90dRow): ObjectiveCard {
  return {
    id: row.id,
    title: row.title,
    kpis: mapObjectiveKpis(row.kpis ?? []),
  };
}

interface ProgressRingProps {
  pct: number;
  size?: number;
}

function ProgressRing({ pct, size = 48 }: ProgressRingProps) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--studio-border)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--studio-accent)"
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

function Ciclo90D({ websiteId }: { websiteId: string }) {
  const quarter = useMemo(() => currentQuarter(), []);
  const quarterLabel = useMemo(() => {
    const parts = quarter.split('-');
    return parts.length === 2 ? parts[1] : quarter;
  }, [quarter]);

  const [objectives, setObjectives] = useState<ObjectiveCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadObjectives() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          websiteId,
          quarter,
          status: 'active',
          limit: '50',
        });
        const response = await fetch(`/api/seo/objectives-90d?${params.toString()}`, {
          cache: 'no-store',
        });

        const json = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              data?: { rows?: Objective90dRow[] };
              error?: { message?: string };
            }
          | null;

        if (!response.ok || !json?.success) {
          throw new Error(json?.error?.message ?? 'No se pudieron cargar los objetivos.');
        }

        if (!isMounted) return;
        const rows = json.data?.rows ?? [];
        setObjectives(rows.map(mapObjectiveToCard));
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error ? loadError.message : 'No se pudieron cargar los objetivos.',
        );
        setObjectives([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadObjectives();
    return () => {
      isMounted = false;
    };
  }, [websiteId, quarter]);

  return (
    <div className="studio-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">🎯</span>
        <div>
          <p className="text-sm font-semibold text-[var(--studio-text)]">Ciclo 90D</p>
          <p className="text-xs text-[var(--studio-text-muted)]">Este trimestre · Objetivos</p>
        </div>
        <div className="ml-auto">
          <StudioBadge tone="neutral">{quarterLabel}</StudioBadge>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1].map((key) => (
            <div
              key={key}
              className="p-3 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg)]"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-12 w-12 rounded-full bg-[var(--studio-border)] animate-pulse" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3 w-3/5 rounded bg-[var(--studio-border)] animate-pulse" />
                  <div className="h-3 w-2/5 rounded bg-[var(--studio-border)] animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-[var(--studio-text-muted)]">
          No pudimos cargar los objetivos del trimestre.
        </p>
      ) : objectives.length === 0 ? (
        <p className="text-xs text-[var(--studio-text-muted)]">
          Sin objetivos configurados para {quarterLabel}.
        </p>
      ) : (
        <div className="space-y-3">
          {objectives.map((obj) => {
            const avgPct =
              obj.kpis.length === 0
                ? 0
                : Math.round(
                    obj.kpis.reduce((sum, kpi) => {
                      const p = kpi.to <= 0 ? 0 : Math.min(100, (kpi.from / kpi.to) * 100);
                      return sum + p;
                    }, 0) / obj.kpis.length,
                  );

            return (
              <div
                key={obj.id}
                className="p-3 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg)]"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex flex-col items-center gap-0.5">
                    <ProgressRing pct={avgPct} />
                    <span className="text-[10px] text-[var(--studio-text-muted)]">{avgPct}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--studio-text)] mb-2">{obj.title}</p>
                    {obj.kpis.length === 0 ? (
                      <p className="text-[11px] text-[var(--studio-text-muted)]">
                        Sin KPIs definidos.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {obj.kpis.map((kpi, index) => (
                          <div
                            key={`${obj.id}-${kpi.label}-${index}`}
                            className="flex items-center justify-between"
                          >
                            <span className="text-xs text-[var(--studio-text-muted)]">{kpi.label}</span>
                            <span className="text-xs font-medium text-[var(--studio-text)]">
                              {kpi.from} → {kpi.to}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SeoOkrCycle({ websiteId, overview }: SeoOkrCycleProps) {
  void websiteId;
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-[var(--studio-text)]">OKR &amp; Ciclo Continuo</h2>
        <StudioBadge tone="info">7 · 30 · 90 días</StudioBadge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Ciclo7D websiteId={websiteId} />
        <Ciclo30D overview={overview} targets={null} />
        <Ciclo90D websiteId={websiteId} />
      </div>
    </div>
  );
}
