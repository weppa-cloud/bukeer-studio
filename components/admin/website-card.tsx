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
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}
      transition={{ duration: 0.2 }}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <Link href={`/dashboard/${id}/pages`}>
        {/* Preview thumbnail */}
        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 relative overflow-hidden">
          {ogImage ? (
            <img src={ogImage} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
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
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
            {name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subdomain}.bukeer.com
          </p>
          {lastEdited && (
            <p className="text-xs text-slate-400 mt-2">
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
            className="p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            aria-label="Delete website"
          >
            <svg className="w-4 h-4 text-slate-500 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </motion.div>
  );
}
