import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DayEventTimeline } from '@/components/site/product-detail/p2/day-event-timeline';

describe('<DayEventTimeline> variant rendering', () => {
  it('renders distinct testids + border-left colors per event_type', () => {
    const markup = renderToStaticMarkup(
      React.createElement(DayEventTimeline, {
        day: 1,
        events: [
          {
            title: 'Hotel Caribe Cartagena',
            event_type: 'lodging',
            star_rating: 4,
            amenities: ['WiFi', 'Piscina'],
            hotel_slug: 'caribe',
          } as unknown as import('@bukeer/website-contract').ScheduleEntry,
          {
            title: 'City Tour histórico',
            event_type: 'activity',
            description: 'Recorrido guiado',
            schedule_data: [
              { title: 'Punto de encuentro', time: '09:00' },
              { title: 'Plaza de los Coches' },
              { title: 'Castillo San Felipe' },
            ],
            activity_slug: 'city-tour',
          } as unknown as import('@bukeer/website-contract').ScheduleEntry,
          {
            title: 'Traslado al aeropuerto',
            event_type: 'transport',
            from_location: 'Hotel Caribe',
            to_location: 'Aeropuerto Rafael Núñez',
            duration: '30 min',
          } as unknown as import('@bukeer/website-contract').ScheduleEntry,
          {
            title: 'Vuelo Cartagena → Bogotá',
            event_type: 'flight',
            marketing_carrier: 'Avianca',
            flight_number: 'AV9402',
            departure: '18:30',
            arrival: '20:05',
          } as unknown as import('@bukeer/website-contract').ScheduleEntry,
        ],
      })
    );

    // All four variants surface distinct testids — confirms dispatch works.
    expect(markup).toContain('data-testid="timeline-event-lodging"');
    expect(markup).toContain('data-testid="timeline-event-activity"');
    expect(markup).toContain('data-testid="timeline-event-transport"');
    expect(markup).toContain('data-testid="timeline-event-flight"');

    // Each variant leaves its own data-event-type on the <li> for CSS hooks.
    expect(markup).toContain('data-event-type="lodging"');
    expect(markup).toContain('data-event-type="activity"');
    expect(markup).toContain('data-event-type="transport"');
    expect(markup).toContain('data-event-type="flight"');

    // Border-left stripe anchored to theme tokens — each type resolves a
    // different CSS var so we can assert the var name per row. Shorthand is
    // split into per-property declarations so Tailwind preflight cannot blank
    // the stripe with its global `* { border-width: 0 }` reset.
    expect(markup).toMatch(/border-left-width:3px/);
    expect(markup).toMatch(/border-left-style:solid/);
    expect(markup).toMatch(/border-left-color:var\(--c-primary/); // lodging
    expect(markup).toMatch(/border-left-color:var\(--c-accent-2/); // transport
    // Flight + activity share the --c-accent token family (accent vs accent-2).
    expect(markup).toMatch(/border-left-color:var\(--c-accent/);

    // Variant-specific payload propagates:
    //   lodging → amenities chips
    expect(markup).toContain('WiFi');
    expect(markup).toContain('Piscina');
    //   flight → "{carrier} {number} · {dep} → {arr}"
    expect(markup).toContain('Avianca AV9402');
    expect(markup).toContain('18:30');
    expect(markup).toContain('20:05');
    //   transport → "{from} → {to} · {duration}"
    expect(markup).toContain('Hotel Caribe → Aeropuerto Rafael Núñez');
    expect(markup).toContain('30 min');
    //   activity → acordeón with step titles (first 5)
    expect(markup).toContain('Punto de encuentro');
    expect(markup).toContain('Castillo San Felipe');

    // Chip labels localized (Hospedaje / Actividad / Traslado / Vuelo).
    expect(markup).toContain('Hospedaje');
    expect(markup).toContain('Actividad');
    expect(markup).toContain('Traslado');
    expect(markup).toContain('Vuelo');
  });

  it('falls back to generic title/description when typed fields are absent', () => {
    const markup = renderToStaticMarkup(
      React.createElement(DayEventTimeline, {
        day: 2,
        events: [
          {
            title: 'Tiempo libre en la playa',
            description: 'Sin actividades programadas.',
            event_type: 'free_time',
          } as import('@bukeer/website-contract').ScheduleEntry,
        ],
      })
    );

    expect(markup).toContain('data-event-type="free_time"');
    expect(markup).toContain('Tiempo libre');
    expect(markup).toContain('Sin actividades programadas.');
  });
});
