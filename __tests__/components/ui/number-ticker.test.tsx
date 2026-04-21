/**
 * NumberTicker SSR + pre-animation regression tests.
 *
 * The component is "use client" but SSR-renders via `react-dom/server`. The
 * critical behaviour we guard here is: the initial DOM text should be the
 * **final** value (formatted), never `0`, so screenshots, crawlers, and
 * users with `prefers-reduced-motion` or JS disabled all see the real stat.
 *
 * Before the fix the `<span>` SSR markup was `{startValue}{suffix}` → "0+",
 * which caused the ColombiaTours audit to capture `0 / 0 / 0 / 0` on the
 * home stats band.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NumberTicker } from '@/components/ui/number-ticker';

describe('<NumberTicker> SSR markup', () => {
  it('renders the final value (not the startValue) in SSR text', () => {
    const html = renderToStaticMarkup(<NumberTicker value={12400} suffix="+" />);
    expect(html).toContain('12,400+');
    expect(html).not.toContain('>0+<');
    expect(html).not.toContain('>0<');
  });

  it('formats decimals with Intl.NumberFormat in SSR', () => {
    const html = renderToStaticMarkup(
      <NumberTicker value={4.9} decimalPlaces={1} suffix="/5" />,
    );
    expect(html).toContain('4.9/5');
  });

  it('drops fraction digits by default', () => {
    const html = renderToStaticMarkup(<NumberTicker value={96} suffix="%" />);
    expect(html).toContain('96%');
  });

  it('renders startValue when direction is down', () => {
    const html = renderToStaticMarkup(
      <NumberTicker value={100} startValue={10} direction="down" />,
    );
    // Down-ticker starts visible at startValue (the countdown target is `value`
    // = the number we animate away from). This matches the legacy contract.
    expect(html).toContain('10');
  });

  it('keeps suffix attached to the value', () => {
    const html = renderToStaticMarkup(<NumberTicker value={32} suffix=" años" />);
    expect(html).toContain('32 años');
  });
});
