import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HotelCard } from '@/components/site/product-detail/p2/hotel-card';

describe('<HotelCard>', () => {
  it('defaults to the inline variant (back-compat with day-event-timeline)', () => {
    const markup = renderToStaticMarkup(
      React.createElement(HotelCard, {
        title: 'Hotel Boutique Sofitel',
        starRating: 5,
        amenities: ['WiFi', 'Spa'],
        description: 'Sobre el mar.',
        hotelSlug: 'sofitel',
      })
    );

    expect(markup).toContain('data-variant="inline"');
    // Inline variant renders the list-row wrapper (`space-y-2`).
    expect(markup).toContain('class="space-y-2"');
    expect(markup).toContain('Hotel Boutique Sofitel');
    expect(markup).toContain('Sobre el mar.');
    // Inline variant must NOT render image/media element nor nights meta.
    expect(markup).not.toContain('aspect-[16/9]');
    expect(markup).not.toContain('noche');
  });

  it('renders the card variant with eyebrow, nights meta, and image media', () => {
    const markup = renderToStaticMarkup(
      React.createElement(HotelCard, {
        title: 'Hotel Caribe',
        starRating: 4,
        amenities: ['WiFi', 'Piscina'],
        hotelSlug: 'caribe',
        variant: 'card',
        imageUrl: 'https://example.com/hotel.jpg',
        city: 'Cartagena',
        category: 'Boutique',
        nights: 3,
      })
    );

    expect(markup).toContain('data-variant="card"');
    // Media container with 16:9 ratio.
    expect(markup).toContain('aspect-[16/9]');
    // Eyebrow combines city + category.
    expect(markup).toContain('Cartagena · Boutique');
    // Nights formatted with plural (>1).
    expect(markup).toContain('3 noches');
    // Still shows star row + amenity badges.
    expect(markup).toContain('4 estrellas');
    expect(markup).toContain('Piscina');
  });

  it('uses singular "noche" for nights === 1 and omits eyebrow when city + category absent', () => {
    const markup = renderToStaticMarkup(
      React.createElement(HotelCard, {
        title: 'Finca Cafetera',
        starRating: 3,
        variant: 'card',
        nights: 1,
      })
    );

    expect(markup).toContain('data-variant="card"');
    expect(markup).toContain('1 noche');
    expect(markup).not.toContain('1 noches');
  });
});
