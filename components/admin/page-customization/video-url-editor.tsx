'use client';

import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MediaLightbox } from '@/components/site/media-lightbox';
import { parseVideoMeta, type VideoProvider } from '@/lib/products/video-url';

export interface VideoUrlEditorProps {
  productId: string;
  videoUrl: string | null;
  videoCaption: string | null;
  readOnly?: boolean;
  onSave?: (next: { video_url: string | null; video_caption: string | null }) => Promise<void>;
}

const PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  mp4: 'MP4',
  external: 'URL externa',
};

function providerVariant(provider: VideoProvider | null): 'emerald' | 'caribbean' | 'secondary' | 'destructive' {
  if (!provider) return 'secondary';
  if (provider === 'youtube') return 'destructive';
  if (provider === 'vimeo') return 'caribbean';
  if (provider === 'mp4') return 'emerald';
  return 'secondary';
}

export function VideoUrlEditor({
  productId,
  videoUrl,
  videoCaption,
  readOnly = false,
  onSave,
}: VideoUrlEditorProps) {
  const [url, setUrl] = useState<string>(videoUrl ?? '');
  const [caption, setCaption] = useState<string>(videoCaption ?? '');
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const meta = useMemo(() => (url ? parseVideoMeta(url) : null), [url]);
  const isExternal = meta?.provider === 'external';

  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    setStatus('saving');
    try {
      await onSave({
        video_url: url.trim() || null,
        video_caption: caption.trim() || null,
      });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [caption, onSave, readOnly, url]);

  const handleClear = useCallback(async () => {
    if (!onSave || readOnly) return;
    setStatus('saving');
    try {
      await onSave({ video_url: null, video_caption: null });
      setUrl('');
      setCaption('');
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [onSave, readOnly]);

  if (readOnly) {
    return (
      <section className="rounded-lg border border-border bg-card p-6" aria-label="Video del producto">
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — no tienes permisos para editar el video.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-4"
      aria-label="Video del producto"
      data-product-id={productId}
    >
      <header>
        <h3 className="text-lg font-semibold text-foreground">Video del producto</h3>
        <p className="text-sm text-muted-foreground">
          Pega URL de YouTube, Vimeo o MP4 directo. Aparecerá como botón &ldquo;Ver video&rdquo; en el hero.
        </p>
      </header>

      <div className="grid gap-2">
        <Label htmlFor="video-url">URL del video</Label>
        <Input
          id="video-url"
          type="url"
          placeholder="https://youtube.com/watch?v=… o https://vimeo.com/… o https://…/video.mp4"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={status === 'saving'}
        />
        {meta && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant={providerVariant(meta.provider)} aria-label={`Proveedor: ${PROVIDER_LABELS[meta.provider]}`}>
              {PROVIDER_LABELS[meta.provider]}
            </Badge>
            {isExternal && (
              <span className="text-amber-700" role="alert">
                URL no reconocida — se abrirá en nueva pestaña en lugar de lightbox
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="video-caption">Título del video (opcional)</Label>
        <Input
          id="video-caption"
          placeholder="Ej. Así se vive el tour"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={200}
          disabled={status === 'saving'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={status === 'saving'}>
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </Button>
        {meta && !isExternal && (
          <Button variant="outline" onClick={() => setPreview(true)} disabled={status === 'saving'}>
            Vista previa
          </Button>
        )}
        {url && (
          <Button variant="ghost" onClick={handleClear} disabled={status === 'saving'}>
            Quitar video
          </Button>
        )}
        {status === 'saved' && <span className="text-sm text-emerald-700" role="status">Guardado</span>}
        {status === 'error' && <span className="text-sm text-destructive" role="alert">Error al guardar</span>}
      </div>

      {preview && meta && !isExternal && (
        <MediaLightbox
          type="video"
          embedUrl={meta.embedUrl}
          title={caption || 'Vista previa'}
          onClose={() => setPreview(false)}
        />
      )}
    </section>
  );
}
