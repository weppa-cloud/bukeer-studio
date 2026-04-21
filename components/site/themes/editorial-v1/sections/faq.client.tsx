/**
 * editorial-v1 — FAQ accordion client leaf.
 *
 * Owns the open-item index. Reuses the designer's `.faq-item`/`.faq-q`/
 * `.faq-a` classes (scoped in `editorial-v1.css`) so the styling matches
 * the Instrument Serif italic headings + plus-icon affordance exactly.
 *
 * We deliberately do NOT use the shadcn <Accordion> primitive here — the
 * designer layout uses max-height transition + rotated plus sign (not a
 * chevron) and relies on the split-grid context, all of which are easier
 * to achieve directly. Accessibility:
 *   - questions are real `<button>` with `aria-expanded`.
 *   - answers use `aria-hidden` + `aria-labelledby` pairing.
 *   - behaviour: click toggles; only one open at a time (designer pattern).
 *   - reduced-motion respected via CSS `@media (prefers-reduced-motion)`.
 */

'use client';

import { useId, useState } from 'react';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqClientProps {
  faqs: FaqItem[];
  initialOpen?: number;
}

export function FaqClient({ faqs, initialOpen = 0 }: FaqClientProps) {
  const [open, setOpen] = useState(initialOpen);
  const baseId = useId();

  if (faqs.length === 0) return null;

  return (
    <div className="faq-list">
      {faqs.map((faq, i) => {
        const isOpen = open === i;
        const qId = `${baseId}-q-${i}`;
        const aId = `${baseId}-a-${i}`;
        return (
          <div className={`faq-item ${isOpen ? 'open' : ''}`} key={qId}>
            <button
              type="button"
              id={qId}
              className="faq-q"
              aria-expanded={isOpen}
              aria-controls={aId}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              <span>{faq.question}</span>
              <span className="plus" aria-hidden="true">
                {Icons.plus({ size: 14 })}
              </span>
            </button>
            <div
              id={aId}
              role="region"
              aria-labelledby={qId}
              aria-hidden={!isOpen}
              className="faq-a"
            >
              {faq.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FaqClient;
