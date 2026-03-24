'use client';

/**
 * Slash Command Menu — Notion-style block inserter.
 *
 * PURE DOM implementation — no React state. This is critical because any
 * React setState in a component that shares a tree with EditorContent
 * causes a "Failed to execute insertBefore" error (React 18 + ProseMirror
 * DOM reconciliation conflict, see tiptap#3764).
 *
 * The menu is created/destroyed as a plain DOM element. React only mounts
 * the effect hook that wires up the keyboard listener.
 */

import type { Editor } from '@tiptap/react';
import { useEffect, useRef } from 'react';

// ─── Command definitions ────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  description: string;
  iconHtml: string;
  category: string;
  command: (editor: Editor) => void;
}

const COMMANDS: CommandItem[] = [
  {
    id: 'paragraph', label: 'Texto', description: 'Parrafo de texto normal',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 4v16"/><path d="M17 4v16"/><path d="M13 4H9a4 4 0 0 0 0 8h4"/></svg>',
    category: 'Texto',
    command: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading2', label: 'Titulo', description: 'Encabezado grande (H2)',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>',
    category: 'Texto',
    command: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3', label: 'Subtitulo', description: 'Encabezado mediano (H3)',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>',
    category: 'Texto',
    command: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'bullet-list', label: 'Lista con vinetas', description: 'Lista no ordenada',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>',
    category: 'Listas',
    command: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered-list', label: 'Lista numerada', description: 'Lista ordenada 1, 2, 3...',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/></svg>',
    category: 'Listas',
    command: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'blockquote', label: 'Cita', description: 'Bloque de cita destacada',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
    category: 'Bloques',
    command: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code-block', label: 'Bloque de codigo', description: 'Codigo con formato',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    category: 'Bloques',
    command: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'hr', label: 'Separador', description: 'Linea horizontal divisoria',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>',
    category: 'Bloques',
    command: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'image', label: 'Imagen', description: 'Subir o insertar una imagen',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    category: 'Media',
    command: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) document.dispatchEvent(new CustomEvent('tiptap:image-upload', { detail: { file } }));
      };
      input.click();
    },
  },
  {
    id: 'link', label: 'Enlace', description: 'Insertar un enlace URL',
    iconHtml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    category: 'Media',
    command: (e) => {
      const url = window.prompt('URL del enlace:');
      if (url) e.chain().focus().setLink({ href: url }).insertContent(url).run();
    },
  },
];

// ─── Pure DOM menu controller ───────────────────────────────────────

class SlashMenuController {
  private menu: HTMLDivElement | null = null;
  private selectedIndex = 0;
  private query = '';
  private filteredItems: CommandItem[] = [];
  private slashFrom = 0;
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  open(coords: { top: number; left: number }, slashFrom: number) {
    this.close();
    this.query = '';
    this.selectedIndex = 0;
    this.slashFrom = slashFrom;
    this.filteredItems = [...COMMANDS];

    this.menu = document.createElement('div');
    this.menu.className = 'slash-command-menu';
    this.menu.setAttribute('data-testid', 'slash-command-menu');
    Object.assign(this.menu.style, {
      position: 'fixed',
      top: `${coords.top}px`,
      left: `${coords.left}px`,
      zIndex: '100',
    });

    this.render();
    document.body.appendChild(this.menu);
  }

  close() {
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
  }

  get isOpen() {
    return !!this.menu;
  }

  handleKey(event: KeyboardEvent): boolean {
    if (!this.isOpen) return false;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
      this.render();
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + this.filteredItems.length - 1) % this.filteredItems.length;
      this.render();
      return true;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.executeSelected();
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.editor.chain().focus().run();
      return true;
    }
    if (event.key === 'Backspace') {
      if (this.query === '') {
        event.preventDefault();
        this.close();
        // Delete the "/"
        this.editor.chain().focus().deleteRange({ from: this.slashFrom, to: this.editor.state.selection.from }).run();
        return true;
      }
      this.query = this.query.slice(0, -1);
      this.filter();
      return true;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.query += event.key;
      this.filter();
      return true;
    }
    return false;
  }

  private filter() {
    const q = this.query.toLowerCase();
    this.filteredItems = COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
    this.selectedIndex = 0;
    this.render();
  }

  private executeSelected() {
    const item = this.filteredItems[this.selectedIndex];
    if (!item) return;
    this.close();
    // Delete "/" and query
    const from = this.slashFrom;
    const to = this.editor.state.selection.from;
    this.editor.chain().focus().deleteRange({ from, to }).run();
    item.command(this.editor);
  }

  private render() {
    if (!this.menu) return;

    if (this.filteredItems.length === 0) {
      this.menu.innerHTML = '<div class="slash-command-empty">Sin resultados</div>';
      return;
    }

    // Group by category
    const groups: { category: string; items: { item: CommandItem; globalIdx: number }[] }[] = [];
    let globalIdx = 0;
    for (const item of this.filteredItems) {
      const last = groups[groups.length - 1];
      if (last?.category === item.category) {
        last.items.push({ item, globalIdx: globalIdx++ });
      } else {
        groups.push({ category: item.category, items: [{ item, globalIdx: globalIdx++ }] });
      }
    }

    this.menu.innerHTML = groups
      .map(
        (g) =>
          `<div class="slash-command-category">${g.category}</div>` +
          g.items
            .map(
              ({ item, globalIdx: idx }) =>
                `<button class="slash-command-item ${idx === this.selectedIndex ? 'is-selected' : ''}" data-idx="${idx}" type="button">
                  <span class="slash-command-icon">${item.iconHtml}</span>
                  <span class="slash-command-text">
                    <span class="slash-command-label">${item.label}</span>
                    <span class="slash-command-description">${item.description}</span>
                  </span>
                </button>`
            )
            .join('')
      )
      .join('');

    // Attach click handlers — use event delegation on the menu container
    // to avoid losing listeners when innerHTML changes.
    // Note: mouseenter only updates CSS classes, NOT innerHTML (which would
    // destroy the DOM element mid-click and lose the mousedown event).
    this.menu.querySelectorAll('.slash-command-item').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Keep editor focus
        e.stopPropagation(); // Prevent outside-click handler
        const idx = parseInt(btn.getAttribute('data-idx') || '0');
        this.selectedIndex = idx;
        this.executeSelected();
      });
      btn.addEventListener('mouseenter', () => {
        const idx = parseInt(btn.getAttribute('data-idx') || '0');
        this.selectedIndex = idx;
        // Update selection visually WITHOUT re-rendering innerHTML
        this.menu?.querySelectorAll('.slash-command-item').forEach((el) => {
          const elIdx = parseInt(el.getAttribute('data-idx') || '-1');
          el.classList.toggle('is-selected', elIdx === idx);
        });
      });
    });

    // Scroll selected into view
    const selected = this.menu.querySelector('.is-selected');
    selected?.scrollIntoView({ block: 'nearest' });
  }
}

// ─── React hook (zero-state) ────────────────────────────────────────

interface SlashMenuProps {
  editor: Editor;
}

export function SlashMenu({ editor }: SlashMenuProps) {
  const controllerRef = useRef<SlashMenuController | null>(null);

  useEffect(() => {
    if (!editor) return;

    const controller = new SlashMenuController(editor);
    controllerRef.current = controller;

    const handleKeyDown = (event: KeyboardEvent) => {
      // If menu is open, let it handle keys first
      if (controller.isOpen) {
        controller.handleKey(event);
        return;
      }

      // Detect "/" typed on empty line
      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        const { $anchor } = editor.state.selection;
        const textBefore = $anchor.parent.textContent.slice(0, $anchor.parentOffset);

        if (textBefore === '' || textBefore.endsWith(' ')) {
          const coords = editor.view.coordsAtPos(editor.state.selection.from);
          // Let "/" be typed first, then open menu
          requestAnimationFrame(() => {
            controller.open(
              { top: coords.bottom + 4, left: coords.left },
              editor.state.selection.from - 1
            );
          });
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (controller.isOpen) {
        const menu = document.querySelector('[data-testid="slash-command-menu"]');
        if (menu && !menu.contains(e.target as Node)) {
          controller.close();
        }
      }
    };

    editor.view.dom.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      editor.view.dom.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      controller.close();
    };
  }, [editor]);

  // No JSX — all DOM manipulation is in SlashMenuController
  return null;
}
