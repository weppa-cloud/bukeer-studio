'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineEvent {
  day?: number | null;
  title: string;
  description?: string | null;
  event_type: string;
  time?: string | null;
}

interface ItineraryDayAccordionProps {
  groups: Array<{ day: number | null; entries: TimelineEvent[] }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ItineraryDayAccordion({ groups }: ItineraryDayAccordionProps) {
  const [openStates, setOpenStates] = useState<boolean[]>(() =>
    groups.map((_, i) => i === 0),
  );

  function toggle(index: number) {
    setOpenStates((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  return (
    <div className="itinerary-day-list">
      {groups.map((group, idx) => {
        const isOpen = openStates[idx] ?? false;
        const firstTitle = group.entries[0]?.title ?? '';
        const count = group.entries.length;
        const locLabel = `${count} actividad${count !== 1 ? 'es' : ''}`;

        return (
          <div
            key={`day-${idx}-${group.day ?? 'single'}`}
            className={`itinerary-day-card${isOpen ? ' open' : ''}`}
          >
            <button
              type="button"
              className="itinerary-day-head"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
            >
              <div className="itinerary-day-num">{group.day ?? '•'}</div>
              <div className="itinerary-day-meta">
                <h3 className="itinerary-day-title">{firstTitle}</h3>
                <p className="itinerary-day-loc">{locLabel}</p>
              </div>
              <ChevronDown
                className={`itinerary-day-chev${isOpen ? ' rotated' : ''}`}
                aria-hidden="true"
              />
            </button>

            <div className="itinerary-day-body">
              <div className="itinerary-day-inner">
                <div className="itinerary-day-content">
                  <ul className="itinerary-activity-list">
                    {group.entries.map((entry, eIdx) => (
                      <li
                        key={`entry-${idx}-${eIdx}`}
                        className="itinerary-activity-item"
                      >
                        <CheckCircle2
                          className="itinerary-activity-check"
                          aria-hidden="true"
                        />
                        <span>{entry.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
