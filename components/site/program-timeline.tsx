import Image from 'next/image';
import type { ScheduleEntry } from '@bukeer/website-contract';

export interface ProgramTimelineProps {
  schedule?: Array<ScheduleEntry | null | undefined> | null;
  title?: string | null;
  subtitle?: string | null;
  className?: string;
}

function normalizeScheduleEntry(entry: ScheduleEntry | null | undefined, index: number): ScheduleEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const title = typeof entry.title === 'string' ? entry.title.trim() : '';
  const description = typeof entry.description === 'string' ? entry.description.trim() : '';
  const image = typeof entry.image === 'string' ? entry.image.trim() : '';
  const time = typeof entry.time === 'string' ? entry.time.trim() : '';

  if (!title) {
    return null;
  }

  return {
    day: typeof entry.day === 'number' ? entry.day : index + 1,
    title,
    description: description || undefined,
    image: image || undefined,
    time: time || undefined,
  };
}

export function ProgramTimeline({
  schedule,
  title,
  subtitle,
  className = '',
}: ProgramTimelineProps) {
  const items = (schedule ?? [])
    .map(normalizeScheduleEntry)
    .filter((item): item is ScheduleEntry => Boolean(item));

  if (items.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-heading)' }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      <ol className="space-y-5">
        {items.map((entry, index) => (
          <li key={`${entry.day ?? index}-${entry.title}`} className="grid gap-4 md:grid-cols-[auto,1fr]">
            <div className="flex flex-col items-center md:pt-1">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 14%, var(--bg-card))',
                  color: 'var(--accent)',
                }}
              >
                {entry.day ?? index + 1}
              </span>
              {index < items.length - 1 && (
                <span
                  className="mt-3 h-full w-px flex-1"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--border-medium) 70%, transparent)' }}
                />
              )}
            </div>

            <article
              className="overflow-hidden rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {entry.image && (
                <div className="relative aspect-[16/9] w-full">
                  <Image
                    src={entry.image}
                    alt={entry.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold leading-6" style={{ color: 'var(--text-heading)' }}>
                    {entry.title}
                  </h3>
                  {entry.time && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--bg))',
                        color: 'var(--accent)',
                      }}
                    >
                      {entry.time}
                    </span>
                  )}
                </div>

                {entry.description && (
                  <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    {entry.description}
                  </p>
                )}
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
