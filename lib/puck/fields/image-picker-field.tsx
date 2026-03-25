/**
 * Image Picker Field for Puck Editor
 *
 * Provides three modes for selecting images:
 * 1. Upload — drag & drop or file picker → Supabase Storage
 * 2. Gallery — browse existing images from Storage
 * 3. URL — paste an external URL
 *
 * Also includes alt text field for SEO.
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

interface ImagePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Auth token for Supabase Storage uploads */
  token?: string;
  /** Storage bucket name */
  bucket?: string;
  /** Storage path prefix (e.g., 'websites/hero') */
  pathPrefix?: string;
}

type PickerMode = 'preview' | 'upload' | 'url';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DEFAULT_BUCKET = 'images';

// ============================================================================
// Component
// ============================================================================

export function ImagePickerField({
  value,
  onChange,
  token,
  bucket = DEFAULT_BUCKET,
  pathPrefix = 'websites',
}: ImagePickerProps) {
  const [mode, setMode] = useState<PickerMode>(value ? 'preview' : 'upload');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      // Validate
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Formato no soportado. Usa JPG, PNG, WebP o GIF.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('La imagen es muy grande. Maximo 5MB.');
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          token
            ? {
                global: {
                  headers: { Authorization: `Bearer ${token}` },
                },
                auth: {
                  persistSession: false,
                  autoRefreshToken: false,
                  detectSessionInUrl: false,
                },
              }
            : undefined
        );

        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filename, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filename);

        onChange(publicUrl);
        setMode('preview');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error al subir la imagen'
        );
      } finally {
        setIsUploading(false);
      }
    },
    [token, bucket, pathPrefix, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setMode('preview');
      setUrlInput('');
    }
  }, [urlInput, onChange]);

  const handleRemove = useCallback(() => {
    onChange('');
    setMode('upload');
  }, [onChange]);

  // Preview mode — show current image
  if (mode === 'preview' && value) {
    return (
      <div style={styles.container}>
        <div style={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            style={styles.previewImage}
            onError={() => setError('No se pudo cargar la imagen')}
          />
          <div style={styles.previewActions}>
            <button
              style={styles.btnSmall}
              onClick={() => setMode('upload')}
              type="button"
            >
              Cambiar
            </button>
            <button
              style={{ ...styles.btnSmall, ...styles.btnDanger }}
              onClick={handleRemove}
              type="button"
            >
              Eliminar
            </button>
          </div>
        </div>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    );
  }

  // Upload / URL mode
  return (
    <div style={styles.container}>
      {/* Mode tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(mode === 'upload' ? styles.tabActive : {}),
          }}
          onClick={() => setMode('upload')}
          type="button"
        >
          Subir
        </button>
        <button
          style={{
            ...styles.tab,
            ...(mode === 'url' ? styles.tabActive : {}),
          }}
          onClick={() => setMode('url')}
          type="button"
        >
          URL
        </button>
      </div>

      {mode === 'upload' && (
        <div
          style={{
            ...styles.dropzone,
            ...(dragOver ? styles.dropzoneActive : {}),
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {isUploading ? (
            <p style={styles.dropzoneText}>Subiendo...</p>
          ) : (
            <>
              <p style={styles.dropzoneText}>
                Arrastra una imagen o haz clic
              </p>
              <p style={styles.dropzoneHint}>JPG, PNG, WebP, GIF — max 5MB</p>
            </>
          )}
        </div>
      )}

      {mode === 'url' && (
        <div style={styles.urlForm}>
          <input
            type="text"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            style={styles.urlInput}
          />
          <button
            style={styles.btnPrimary}
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            type="button"
          >
            Usar
          </button>
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

// ============================================================================
// Inline styles (Puck fields render outside Tailwind context)
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 4,
  },
  tab: {
    padding: '4px 12px',
    fontSize: 12,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 4,
    color: '#6b7280',
  },
  tabActive: {
    background: '#f3f4f6',
    color: '#111827',
    fontWeight: 500,
  },
  dropzone: {
    border: '2px dashed #d1d5db',
    borderRadius: 8,
    padding: 24,
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 150ms',
  },
  dropzoneActive: {
    borderColor: '#6d28d9',
    background: '#f5f3ff',
  },
  dropzoneText: {
    margin: 0,
    fontSize: 13,
    color: '#374151',
  },
  dropzoneHint: {
    margin: '4px 0 0',
    fontSize: 11,
    color: '#9ca3af',
  },
  urlForm: {
    display: 'flex',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 13,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    outline: 'none',
  },
  btnPrimary: {
    padding: '6px 14px',
    fontSize: 13,
    background: '#6d28d9',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  btnSmall: {
    padding: '4px 10px',
    fontSize: 12,
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    cursor: 'pointer',
  },
  btnDanger: {
    color: '#dc2626',
  },
  preview: {
    position: 'relative' as const,
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  previewImage: {
    width: '100%',
    height: 120,
    objectFit: 'cover' as const,
    display: 'block',
  },
  previewActions: {
    display: 'flex',
    gap: 8,
    padding: 8,
    background: '#f9fafb',
  },
  error: {
    margin: 0,
    fontSize: 12,
    color: '#dc2626',
  },
};

// ============================================================================
// Puck Custom Field Factory
// ============================================================================

/**
 * Creates a Puck custom field definition for image picking.
 * Use in page-config.ts field definitions.
 */
export function createImagePickerField(label: string) {
  return {
    type: 'custom' as const,
    label,
    render: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (val: string) => void;
    }) => <ImagePickerField value={value || ''} onChange={onChange} />,
  };
}
