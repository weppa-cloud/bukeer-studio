'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StudioButton } from '@/components/studio/ui/primitives';
import { Shuffle, Check } from 'lucide-react';

// ============================================================================
// Tourism presets (lightweight reference — mirrors theme-sdk presets)
// ============================================================================

const THEME_PRESETS = [
  { id: 'adventure',  name: 'Aventura',    emoji: '🏔️', seedColor: '#2E7D32', description: 'Bold, outdoor, active' },
  { id: 'luxury',     name: 'Lujo',        emoji: '💎', seedColor: '#6D4C41', description: 'Elegant, premium, refined' },
  { id: 'tropical',   name: 'Tropical',    emoji: '🌴', seedColor: '#00897B', description: 'Turquoise, warm, playful' },
  { id: 'corporate',  name: 'Corporativo', emoji: '🏢', seedColor: '#1565C0', description: 'Professional, trust, clean' },
  { id: 'boutique',   name: 'Boutique',    emoji: '🌸', seedColor: '#AD1457', description: 'Warm, personal, intimate' },
  { id: 'cultural',   name: 'Cultural',    emoji: '🏛️', seedColor: '#4527A0', description: 'Rich, heritage, artistic' },
  { id: 'eco',        name: 'Eco',         emoji: '🌿', seedColor: '#2E7D32', description: 'Natural, sustainable, green' },
  { id: 'romantic',   name: 'Romántico',   emoji: '💕', seedColor: '#C2185B', description: 'Soft, pastel, dreamy' },
] as const;

// ============================================================================
// Component
// ============================================================================

interface ThemeQuickEditorProps {
  currentSeedColor?: string;
  onPresetSelect?: (presetId: string, seedColor: string) => void;
  className?: string;
}

export function ThemeQuickEditor({
  currentSeedColor,
  onPresetSelect,
  className,
}: ThemeQuickEditorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleShuffle = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * THEME_PRESETS.length);
    const preset = THEME_PRESETS[randomIndex];
    setSelectedPreset(preset.id);
    onPresetSelect?.(preset.id, preset.seedColor);
  }, [onPresetSelect]);

  const handlePresetClick = useCallback(
    (presetId: string, seedColor: string) => {
      setSelectedPreset(presetId);
      onPresetSelect?.(presetId, seedColor);
    },
    [onPresetSelect]
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--studio-text-muted)] uppercase tracking-wider">
          Theme
        </h3>
        <StudioButton
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          className="gap-1.5 text-xs"
        >
          <Shuffle className="w-3 h-3" />
          Shuffle
        </StudioButton>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-1.5">
          {THEME_PRESETS.map((preset) => {
            const isActive = selectedPreset === preset.id ||
              (currentSeedColor?.toLowerCase() === preset.seedColor.toLowerCase());

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id, preset.seedColor)}
                className={cn(
                  'w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left',
                  'border border-[var(--studio-border)]',
                  'hover:border-[color-mix(in_srgb,var(--studio-primary)_40%,transparent)]',
                  'hover:bg-[color-mix(in_srgb,var(--studio-primary)_6%,transparent)]',
                  isActive && 'ring-2 ring-[var(--studio-primary)] border-transparent bg-[color-mix(in_srgb,var(--studio-primary)_10%,transparent)]'
                )}
              >
                {/* Color swatch */}
                <div
                  className="w-8 h-8 rounded-lg shrink-0 shadow-sm border border-black/10"
                  style={{ backgroundColor: preset.seedColor }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{preset.emoji}</span>
                    <span className="text-xs font-medium text-[var(--studio-text)]">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--studio-text-muted)] mt-0.5 truncate">
                    {preset.description}
                  </p>
                </div>

                {/* Active check */}
                {isActive && (
                  <Check className="w-4 h-4 text-[var(--studio-primary)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Seed color input */}
        <div className="px-3 pb-3 pt-2 border-t border-[var(--studio-border)]">
          <label className="text-[10px] font-medium text-[var(--studio-text-muted)] uppercase tracking-wider mb-1.5 block">
            Custom Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentSeedColor ?? '#1565C0'}
              onChange={(e) => {
                setSelectedPreset(null);
                onPresetSelect?.('custom', e.target.value);
              }}
              className="w-8 h-8 rounded cursor-pointer border border-[var(--studio-border)]"
            />
            <span className="text-xs text-[var(--studio-text-muted)] font-mono">
              {currentSeedColor ?? '#1565C0'}
            </span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
