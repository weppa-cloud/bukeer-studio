'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useWebsite } from '@/lib/admin/website-context';
import { EmptyState } from '@/components/admin/empty-state';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
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

  const typeColors: Record<string, string> = {
    category: 'bg-purple-100 text-purple-700',
    static: 'bg-slate-100 text-slate-700',
    custom: 'bg-blue-100 text-blue-700',
    anchor: 'bg-amber-100 text-amber-700',
    external: 'bg-green-100 text-green-700',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Drag to reorder"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onEdit(page)}
          className="text-left"
        >
          <h3 className="font-medium text-slate-900 dark:text-white truncate">
            {page.title}
          </h3>
          <p className="text-sm text-slate-500">/{page.slug}</p>
        </button>
      </div>

      {/* Type badge */}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[page.page_type] || typeColors.custom}`}>
        {page.page_type}
      </span>

      {/* Published status */}
      <StatusBadge status={page.is_published ? 'published' : 'draft'} />

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={`/dashboard/${websiteId}/pages/${page.id}/edit`}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Edit in Studio"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </a>
        <button
          onClick={() => onDelete(page.id)}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
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

      // Update nav_order in DB
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
    const slug = newSlug || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pages</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/${websiteId}/pages/home/edit`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Homepage
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" d="M12 5v14M5 12h14" />
            </svg>
            Add page
          </button>
        </div>
      </div>

      {pages.length === 0 ? (
        <EmptyState
          title="Add your first page"
          description="Create pages to organize your website content."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl"
            >
              Add page
            </button>
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {pages.map((page) => (
                <SortablePageRow
                  key={page.id}
                  page={page as any}
                  websiteId={websiteId}
                  onEdit={() => router.push(`/dashboard/${websiteId}/pages/${page.id}/edit`)}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create page dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Create page</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="About Us"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug</label>
                <input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="about-us"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="custom">Custom</option>
                  <option value="static">Static</option>
                  <option value="category">Category</option>
                  <option value="anchor">Anchor</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle || creating}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete page"
        description="This page will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
