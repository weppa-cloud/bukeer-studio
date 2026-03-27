'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { StatusBadge } from './status-badge';

interface WebsiteCardProps {
  id: string;
  name: string;
  subdomain: string;
  status: 'draft' | 'published';
  lastEdited?: string;
  ogImage?: string;
  onDelete?: (id: string) => void;
}

export function WebsiteCard({
  id,
  name,
  subdomain,
  status,
  lastEdited,
  ogImage,
  onDelete,
}: WebsiteCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: 'var(--studio-shadow-lg)' }}
      transition={{ duration: 0.2 }}
      className="studio-card group relative overflow-hidden"
    >
      <Link href={`/dashboard/${id}/pages`}>
        {/* Preview thumbnail */}
        <div className="aspect-video bg-[var(--studio-panel)] relative overflow-hidden">
          {ogImage ? (
            <img src={ogImage} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--studio-text-muted)]">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="1" />
                <path strokeWidth="1" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 right-3">
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-[var(--studio-text)] truncate">
            {name}
          </h3>
          <p className="text-sm text-[var(--studio-text-muted)] mt-1">
            {subdomain}.bukeer.com
          </p>
          {lastEdited && (
            <p className="text-xs text-[var(--studio-text-muted)] mt-2">
              Edited {new Date(lastEdited).toLocaleDateString()}
            </p>
          )}
        </div>
      </Link>

      {/* Context menu */}
      {onDelete && (
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(id);
            }}
            className="p-1.5 rounded-lg shadow transition-colors bg-[var(--studio-bg-elevated)] hover:bg-[color-mix(in_srgb,var(--studio-danger)_10%,var(--studio-bg-elevated))]"
            aria-label="Delete website"
          >
            <svg className="w-4 h-4 text-[var(--studio-text-muted)] hover:text-[var(--studio-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </motion.div>
  );
}
