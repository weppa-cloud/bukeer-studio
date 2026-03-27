'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useWebsite } from '@/lib/admin/website-context';
import { EmptyState } from '@/components/admin/empty-state';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  StudioPage,
  StudioSectionHeader,
  StudioButton,
  StudioInput,
  StudioSelect,
  StudioBadge,
  StudioBadgeStatus,
  StudioListRow,
} from '@/components/studio/ui/primitives';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  page_type: string;
  is_published: boolean;
}

const TYPE_TONE: Record<string, 'neutral' | 'info' | 'warning'> = {
  static: 'neutral',
  category: 'info',
  custom: 'warning',
  anchor: 'neutral',
  external: 'info',
};

function normalizeTypeLabel(pageType: string) {
  return pageType.replace(/_/g, ' ');
}

function SortablePageRow({
  page,
  websiteId,
  onEdit,
  onDelete,
}: {
  page: PageRow;
  websiteId: string;
  onEdit: (page: PageRow) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <StudioListRow
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--studio-text-muted)]/60 hover:text-[var(--studio-text)] transition-colors"
        aria-label="Drag to reorder"
        type="button"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </button>

      <button onClick={() => onEdit(page)} className="text-left min-w-0 flex-1" type="button">
        <h3 className="font-semibold text-sm text-[var(--studio-text)] truncate">{page.title}</h3>
        <p className="text-xs text-[var(--studio-text-muted)]">/{page.slug}</p>
      </button>

      <StudioBadge tone={TYPE_TONE[page.page_type] || 'neutral'} className="uppercase tracking-wide text-[10px]">
        {normalizeTypeLabel(page.page_type)}
      </StudioBadge>

      <StudioBadgeStatus status={page.is_published ? 'published' : 'draft'} />

      <div className="flex items-center gap-1">
        <a
          href={`/dashboard/${websiteId}/pages/${page.id}/edit`}
          className="studio-btn studio-btn-ghost studio-btn-sm"
          title="Edit in Studio"
        >
          Edit
        </a>
        <button
          onClick={() => onDelete(page.id)}
          className="studio-btn studio-btn-ghost studio-btn-sm !text-[var(--studio-danger)]"
          title="Delete page"
          type="button"
        >
          Delete
        </button>
      </div>
    </StudioListRow>
  );
}

export default function PagesTab() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const { pages, refetch } = useWebsite();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newType, setNewType] = useState('custom');
  const [creating, setCreating] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(pages, oldIndex, newIndex);

      await Promise.all(
        reordered.map((page, i) =>
          supabase
            .from('website_pages')
            .update({ nav_order: i })
            .eq('id', page.id)
        )
      );
      refetch();
    },
    [pages, supabase, refetch]
  );

  async function handleCreate() {
    setCreating(true);
    const slug =
      newSlug || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    await supabase.from('website_pages').insert({
      website_id: websiteId,
      title: newTitle,
      slug,
      page_type: newType,
      is_published: false,
      nav_order: pages.length,
      hero_config: {},
      intro_content: {},
      cta_config: {},
      sections: [],
    });

    setShowCreate(false);
    setNewTitle('');
    setNewSlug('');
    setCreating(false);
    refetch();
  }

  async function handleDelete(id: string) {
    await supabase.from('website_pages').delete().eq('id', id);
    setDeleteId(null);
    refetch();
  }

  return (
    <StudioPage className="max-w-5xl">
      <div className="studio-card mb-6 p-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">Homepage</h3>
          <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
            Your main landing page with all sections.
          </p>
        </div>
        <StudioButton onClick={() => router.push(`/dashboard/${websiteId}/pages/home/edit`)}>
          Edit Homepage
        </StudioButton>
      </div>

      <StudioSectionHeader
        title="Pages"
        subtitle={`${pages.length} pages`}
        actions={<StudioButton onClick={() => setShowCreate(true)}>Add page</StudioButton>}
      />

      {pages.length === 0 ? (
        <EmptyState
          title="Add your first page"
          description="Create pages to organize your website content."
          action={<StudioButton onClick={() => setShowCreate(true)}>Add page</StudioButton>}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {pages.map((page) => (
                <SortablePageRow
                  key={page.id}
                  page={page as PageRow}
                  websiteId={websiteId}
                  onEdit={() => router.push(`/dashboard/${websiteId}/pages/${page.id}/edit`)}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
          <div className="studio-panel w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-semibold text-[var(--studio-text)]">Create page</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--studio-text-muted)]">Title</label>
                <StudioInput
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setNewSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')
                    );
                  }}
                  placeholder="About Us"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--studio-text-muted)]">Slug</label>
                <StudioInput
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="about-us"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--studio-text-muted)]">Type</label>
                <StudioSelect
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  options={[
                    { value: 'custom', label: 'Custom' },
                    { value: 'static', label: 'Static' },
                    { value: 'category', label: 'Category' },
                    { value: 'anchor', label: 'Anchor' },
                    { value: 'external', label: 'External' },
                  ]}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <StudioButton variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </StudioButton>
              <StudioButton onClick={handleCreate} disabled={!newTitle || creating}>
                {creating ? 'Creating...' : 'Create'}
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete page"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </StudioPage>
  );
}
