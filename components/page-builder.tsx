'use client';

import React from 'react';
import { Block } from '@/types/blocks';
import { HeroModern } from './blocks/hero-modern';
// Import other blocks here as we migrate them

// -----------------------------------------------------------------------------
// BLOCK REGISTRY
// -----------------------------------------------------------------------------
// Maps the JSON 'type' string to the actual React Component.
// This ensures 100% deterministic rendering.
// -----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BLOCK_REGISTRY: Record<string, React.ComponentType<any>> = {
  'hero-modern': HeroModern,
  // 'bento-grid': BentoGrid,
  // 'cta-section': CtaSection,
};

interface PageBuilderProps {
  blocks: Block[];
}

export function PageBuilder({ blocks }: PageBuilderProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      {blocks.map((block) => {
        const Component = BLOCK_REGISTRY[block.type];

        if (!Component) {
          console.warn(`Block type "${block.type}" not found in registry.`);
          return (
            <div key={block.id} className="p-4 border border-red-200 bg-red-50 text-red-500 rounded my-4">
              Block type <strong>{block.type}</strong> not supported yet.
            </div>
          );
        }

        return (
          <div key={block.id} id={block.id} className="w-full">
            <Component {...block.props} />
          </div>
        );
      })}
    </div>
  );
}
