# Next.js Patterns — Bukeer Website Studio

## Component Patterns

### Client Component (interactive)
```tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyComponentProps {
  title: string;
  onAction: () => void;
  className?: string;
}

export function MyComponent({ title, onAction, className }: MyComponentProps) {
  const [loading, setLoading] = useState(false);

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={onAction} disabled={loading}>
          Action
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Server Component (data fetching)
```tsx
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';

export default async function MyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data } = await supabase
    .from('websites')
    .select('*')
    .eq('id', id)
    .single();

  return <ClientComponent data={data} />;
}
```

### Dashboard Layout (auth guard)
```tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirect=/dashboard');

  return <Shell>{children}</Shell>;
}
```

## Data Fetching

### Client-side (useEffect)
```tsx
'use client';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

function MyComponent() {
  const [data, setData] = useState(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase
      .from('websites')
      .select('*')
      .then(({ data }) => setData(data));
  }, []);
}
```

### Server-side (RSC)
```tsx
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc('get_website_editor_snapshot', { p_website_id: id });
  return <Editor data={data} />;
}
```

### With autosave
```tsx
const { status, saveNow } = useAutosave({
  data: formData,
  onSave: async (data) => {
    await supabase.from('websites').update(data).eq('id', websiteId);
  },
  debounceMs: 2000,
  enabled: isDirty,
});

// status: 'idle' | 'saving' | 'saved' | 'error'
```

## State Management

### Context pattern
```tsx
// Provider
const MyContext = createContext<MyContextValue | null>(null);

export function MyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState);
  return <MyContext.Provider value={{ state, setState }}>{children}</MyContext.Provider>;
}

// Hook
export function useMyContext() {
  const ctx = useContext(MyContext);
  if (!ctx) throw new Error('useMyContext must be inside MyProvider');
  return ctx;
}
```

### URL state (filters, pagination)
```tsx
const searchParams = useSearchParams();
const router = useRouter();

const filter = searchParams.get('filter') || 'all';
const setFilter = (f: string) => router.push(`?filter=${f}`);
```

## Error Handling

### API routes
```tsx
export async function POST(request: NextRequest) {
  try {
    const auth = await getEditorAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    // ... logic

    return NextResponse.json(result);
  } catch (err) {
    console.error('[MyRoute] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Components
```tsx
import { toast } from 'sonner';

async function handleSave() {
  try {
    await save(data);
    toast.success('Saved!');
  } catch {
    toast.error('Failed to save');
  }
}
```

### Section rendering (graceful)
```tsx
// Dev: show warning. Prod: skip silently.
if (!isValidSectionType(type)) {
  if (process.env.NODE_ENV === 'development') {
    return <WarningBanner message={`Unknown: ${type}`} />;
  }
  return null;
}
```

## Styling

### Tailwind v4 conventions
```tsx
// Good
<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">

// Bad — no inline styles
<div style={{ backgroundColor: 'white', borderRadius: 12 }}>

// Class merging
import { cn } from '@/lib/utils';
<div className={cn('base-class', isActive && 'active-class', className)}>
```

### Dark mode
```tsx
// All elements need dark: variants
<p className="text-slate-900 dark:text-white">Title</p>
<div className="bg-slate-50 dark:bg-slate-900">Content</div>
<div className="border-slate-200 dark:border-slate-700">Border</div>
```

### Responsive
```tsx
// Mobile-first
<div className="p-4 md:p-6 lg:p-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## Drag-and-Drop (dnd-kit)

```tsx
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}>
      <button {...listeners}>≡</button>
      {children}
    </div>
  );
}

function SortableList({ items, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }, // Prevent accidental drag on click
  }));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onReorder(active.id, over.id);
      }}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {items.map(item => (
          <SortableItem key={item.id} id={item.id}>
            <ItemContent item={item} />
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```
