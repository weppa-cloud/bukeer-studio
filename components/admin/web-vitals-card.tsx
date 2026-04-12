'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

const THRESHOLDS: Record<string, { good: number; needsImprovement: number; unit: string }> = {
  LCP: { good: 2500, needsImprovement: 4000, unit: 's' },
  INP: { good: 200, needsImprovement: 500, unit: 'ms' },
  CLS: { good: 0.1, needsImprovement: 0.25, unit: '' },
  FCP: { good: 1800, needsImprovement: 3000, unit: 's' },
  TTFB: { good: 800, needsImprovement: 1800, unit: 's' },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'poor';
  if (value < threshold.good) return 'good';
  if (value < threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function formatValue(name: string, value: number): string {
  const threshold = THRESHOLDS[name];
  if (!threshold) return String(value);
  if (threshold.unit === 's') return `${(value / 1000).toFixed(1)}s`;
  if (threshold.unit === 'ms') return `${Math.round(value)}ms`;
  return value.toFixed(2);
}

function formatThreshold(name: string): string {
  const t = THRESHOLDS[name];
  if (!t) return '';
  if (t.unit === 's') return `<${(t.good / 1000).toFixed(1)}s`;
  if (t.unit === 'ms') return `<${t.good}ms`;
  return `<${t.good}`;
}

const ratingConfig = {
  good: { label: 'Good', color: 'text-green-600', icon: '\u2705' },
  'needs-improvement': { label: 'Needs Improvement', color: 'text-amber-600', icon: '\u26a0\ufe0f' },
  poor: { label: 'Poor', color: 'text-red-600', icon: '\u274c' },
};

export function WebVitalsCard({ websiteId }: { websiteId: string }) {
  const [metrics, setMetrics] = useState<VitalMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVitals() {
      try {
        const res = await fetch(`/api/analytics/vitals?websiteId=${websiteId}&days=7`);
        if (res.ok) {
          const data = await res.json();
          if (data.metrics) {
            setMetrics(data.metrics);
          }
        }
      } catch {
        // Silently fail — card shows empty state
      } finally {
        setLoading(false);
      }
    }
    fetchVitals();
  }, [websiteId]);

  const vitals = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Core Web Vitals (últimos 7 días)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {vitals.map((v) => (
              <div key={v} className="h-6 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin datos aún. Los métricas aparecerán cuando los visitantes naveguen el sitio.
          </p>
        ) : (
          <div className="space-y-2">
            {vitals.map((name) => {
              const metric = metrics.find((m) => m.name === name);
              if (!metric) return (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="font-mono w-12">{name}</span>
                  <span className="text-muted-foreground">—</span>
                </div>
              );

              const rating = getRating(name, metric.value);
              const config = ratingConfig[rating];

              return (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="font-mono w-12">{name}</span>
                  <span className="font-medium">{formatValue(name, metric.value)}</span>
                  <span className={config.color}>
                    {config.icon} {config.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    ({formatThreshold(name)})
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
