'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { EmptyState } from '@/components/admin/empty-state';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  StudioPage,
  StudioSectionHeader,
  StudioButton,
  StudioTabs,
  StudioSearch,
  StudioSelect,
  StudioListRow,
  StudioBadgeStatus,
} from '@/components/studio/ui/primitives';

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

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'converted', label: 'Converted' },
  { id: 'archived', label: 'Archived' },
] as const;

export default function QuotesTab() {
  const routeParams = useParams<{ websiteId: string }>();
  const websiteId = routeParams?.websiteId ?? '';
  const supabase = createSupabaseBrowserClient();

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]['id']>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('website_quote_requests')
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
    await supabase.from('website_quote_requests').update({ status }).eq('id', id);
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
  }

  async function handleDelete(ids: string[]) {
    await supabase.from('website_quote_requests').delete().in('id', ids);
    setDeleteIds([]);
    setSelected(new Set());
    fetchLeads();
  }

  function exportCSV() {
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Product', 'Status', 'Message'];
    const rows = leads.map((lead) => [
      new Date(lead.created_at).toLocaleDateString(),
      lead.name,
      lead.email,
      lead.phone || '',
      lead.product_name || '',
      lead.status,
      (lead.message || '').replace(/"/g, '""'),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Leads & Quotes"
        subtitle="Pipeline operacional para solicitudes y conversiones."
        actions={<StudioButton variant="outline" onClick={exportCSV}>Export CSV</StudioButton>}
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StudioTabs
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
        />
        <StudioSearch
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="flex-1 min-w-[240px] max-w-sm"
          placeholder="Search by name or email..."
        />
      </div>

      {selected.size > 0 && (
        <div className="studio-panel mb-4 p-3 flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--studio-text)]">{selected.size} selected</span>
          <StudioButton size="sm" variant="danger" onClick={() => setDeleteIds(Array.from(selected))}>
            Delete
          </StudioButton>
          <StudioButton size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </StudioButton>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel)] animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState title="No leads yet" description="Quote requests from your website will appear here." />
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <div key={lead.id}>
              <StudioListRow
                className="p-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 flex-1 min-w-0">
                    <span className="text-xs text-[var(--studio-text-muted)]">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-semibold text-[var(--studio-text)] truncate">{lead.name}</span>
                    <span className="text-sm text-[var(--studio-text-muted)] truncate">{lead.email}</span>
                    <span className="text-sm text-[var(--studio-text-muted)] truncate">{lead.product_name || '-'}</span>
                  </div>
                  <StudioBadgeStatus status={lead.status} />
                  <div onClick={(e) => e.stopPropagation()}>
                    <StudioSelect
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value as LeadRow['status'])}
                      className="min-w-[128px]"
                      options={[
                        { value: 'new', label: 'New' },
                        { value: 'contacted', label: 'Contacted' },
                        { value: 'converted', label: 'Converted' },
                        { value: 'archived', label: 'Archived' },
                      ]}
                    />
                  </div>
                </div>
              </StudioListRow>

              {expandedId === lead.id && (
                <div className="studio-panel mt-1 ml-6 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[var(--studio-text-muted)]">Phone:</span>{' '}
                      <span className="text-[var(--studio-text)]">{lead.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--studio-text-muted)]">Product:</span>{' '}
                      <span className="text-[var(--studio-text)]">
                        {lead.product_name || '-'} ({lead.product_type || 'N/A'})
                      </span>
                    </div>
                  </div>
                  {lead.message && (
                    <div className="mt-3">
                      <span className="text-sm text-[var(--studio-text-muted)]">Message:</span>
                      <p className="text-sm text-[var(--studio-text)] mt-1 whitespace-pre-wrap">{lead.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {leads.length === PAGE_SIZE && (
        <div className="flex justify-center mt-6 gap-2">
          <StudioButton
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </StudioButton>
          <StudioButton size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
            Next
          </StudioButton>
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
    </StudioPage>
  );
}
