'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  product_name: string | null;
  product_type: string | null;
  status: 'new' | 'contacted' | 'converted' | 'archived';
  created_at: string;
}

export default function QuotesTab() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const supabase = createSupabaseBrowserClient();

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('quote_requests')
      .select('*')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data } = await query;
    setLeads((data || []) as LeadRow[]);
    setLoading(false);
  }, [websiteId, supabase, statusFilter, search, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  async function updateStatus(id: string, status: LeadRow['status']) {
    await supabase.from('quote_requests').update({ status }).eq('id', id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
  }

  async function handleDelete(ids: string[]) {
    await supabase.from('quote_requests').delete().in('id', ids);
    setDeleteIds([]);
    setSelected(new Set());
    fetchLeads();
  }

  function exportCSV() {
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Product', 'Status', 'Message'];
    const rows = leads.map((l) => [
      new Date(l.created_at).toLocaleDateString(),
      l.name,
      l.email,
      l.phone || '',
      l.product_name || '',
      l.status,
      (l.message || '').replace(/"/g, '""'),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const STATUSES = ['all', 'new', 'contacted', 'converted', 'archived'] as const;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Leads & Quotes</h2>
        <button
          onClick={exportCSV}
          className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`px-3 py-1.5 text-sm rounded-full capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 max-w-xs px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
          placeholder="Search by name or email..."
        />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <span className="text-sm text-blue-700">{selected.size} selected</span>
          <button
            onClick={() => handleDelete(Array.from(selected))}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg"
          >
            Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-slate-500 ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Quote requests from your website will appear here."
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="1.5" d="M22 12h-6l-2 3H10l-2-3H2" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <div key={lead.id}>
              <div
                className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(lead.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(lead.id)) next.delete(lead.id);
                    else next.add(lead.id);
                    setSelected(next);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
                  <span className="text-sm text-slate-400">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {lead.name}
                  </span>
                  <span className="text-sm text-slate-500 truncate">{lead.email}</span>
                  <span className="text-sm text-slate-500 truncate">{lead.product_name || '-'}</span>
                </div>
                <StatusBadge status={lead.status} />
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value as LeadRow['status'])}
                    className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === lead.id && (
                <div className="ml-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl border-x border-b border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Phone:</span>{' '}
                      <span className="text-slate-900 dark:text-white">{lead.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Product:</span>{' '}
                      <span className="text-slate-900 dark:text-white">
                        {lead.product_name} ({lead.product_type || 'N/A'})
                      </span>
                    </div>
                  </div>
                  {lead.message && (
                    <div className="mt-3">
                      <span className="text-sm text-slate-500">Message:</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                        {lead.message}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {leads.length === PAGE_SIZE && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
          >
            Previous
          </button>
          <button onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm rounded-lg border">
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={deleteIds.length > 0}
        title={`Delete ${deleteIds.length} lead(s)`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => handleDelete(deleteIds)}
        onCancel={() => setDeleteIds([])}
      />
    </div>
  );
}
