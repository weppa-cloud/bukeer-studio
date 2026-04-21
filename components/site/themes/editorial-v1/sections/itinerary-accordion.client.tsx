/**
 * editorial-v1 — Itinerary Accordion client leaf.
 *
 * Owns the open-day index. Server renders all day content in HTML (SEO);
 * this leaf controls which day card is visually expanded.
 *
 * Accessibility:
 *   - Day headers are real `<button>` elements with `aria-expanded`.
 *   - Day bodies use `role="region"` + `aria-labelledby`.
 *   - One open at a time (default: day 0).
 *   - Reduced-motion respected via CSS.
 */

'use client';

import { useId, useState } from 'react';
import Image from 'next/image';

export interface ItineraryDayProps {
  dayNumber: number;
  title: string;
  summary: string;
  location: string;
  activities: string[];
  image?: string;
}

interface ItineraryAccordionClientProps {
  days: ItineraryDayProps[];
  initialOpen?: number;
}

export function ItineraryAccordionClient({
  days,
  initialOpen = 0,
}: ItineraryAccordionClientProps) {
  const [open, setOpen] = useState(initialOpen);
  const baseId = useId();

  if (days.length === 0) return null;

  return (
    <div className="itinerary-day-list">
      {days.map((day, i) => {
        const isOpen = open === i;
        const headId = `${baseId}-day-head-${i}`;
        const bodyId = `${baseId}-day-body-${i}`;
        const paddedNum = String(day.dayNumber).padStart(2, '0');

        return (
          <div
            className={`itinerary-day-card${isOpen ? ' open' : ''}`}
            key={headId}
          >
            <button
              type="button"
              id={headId}
              className="itinerary-day-head"
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              {/* Day number badge */}
              <div className="itinerary-day-num" aria-hidden="true">
                <span>{paddedNum}</span>
              </div>

              {/* Title + location row */}
              <div className="itinerary-day-meta">
                <span className="itinerary-day-loc label">{day.location}</span>
                <h3 className="title-lg itinerary-day-title">{day.title}</h3>
              </div>

              {/* Chevron */}
              <span
                className={`itinerary-day-chev${isOpen ? ' rotated' : ''}`}
                aria-hidden="true"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            <div
              id={bodyId}
              role="region"
              aria-labelledby={headId}
              aria-hidden={!isOpen}
              className="itinerary-day-body"
            >
              <div className="itinerary-day-inner">
                {/* Left: summary + activities */}
                <div className="itinerary-day-content">
                  <p className="body-md itinerary-day-summary">{day.summary}</p>

                  {day.activities.length > 0 && (
                    <ul className="itinerary-activity-list">
                      {day.activities.map((activity, j) => (
                        <li key={`${headId}-act-${j}`} className="itinerary-activity-item">
                          <span className="itinerary-activity-check" aria-hidden="true">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span className="body-md">{activity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Right: day image when present */}
                {day.image ? (
                  <div className="itinerary-day-media">
                    <Image
                      src={day.image}
                      alt={`${day.title} — ${day.location}`}
                      fill
                      loading="lazy"
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, 340px"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ItineraryAccordionClient;
