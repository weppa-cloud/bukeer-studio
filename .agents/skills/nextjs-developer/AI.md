# AI Integration — Reference

## LLM Provider

```typescript
// lib/ai/llm-provider.ts
import { createOpenAI } from '@ai-sdk/openai';

const openrouter = createOpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_AUTH_TOKEN || '',
});

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';
export function getEditorModel() { return openrouter(DEFAULT_MODEL); }
```

## API Route Pattern (streaming)

```typescript
// app/api/ai/studio-chat/route.ts
import { streamText } from 'ai';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';

export async function POST(request: NextRequest) {
  // 1. Auth
  const auth = await getEditorAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasEditorRole(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 2. Rate limit
  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) return NextResponse.json({ error: rateCheck.reason }, { status: 429 });

  // 3. Stream
  const result = streamText({
    model: getEditorModel(),
    system: 'You are the Bukeer Website Studio assistant...',
    messages,
    tools: { /* ... */ },
  });

  // 4. Record cost
  recordCost(auth.accountId, 0.003);

  return result.toDataStreamResponse();
}
```

## API Route Pattern (structured)

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const result = await generateObject({
  model: getEditorModel(),
  schema: z.object({ title: z.string(), content: z.string() }),
  prompt: 'Generate a hero section...',
});

return NextResponse.json(result.object);
```

## Client Chat (useChat)

```typescript
'use client';
import { useChat } from '@ai-sdk/react';  // Requires @ai-sdk/react package

function StudioChat({ websiteId }: { websiteId: string }) {
  const { messages, input, handleInputChange, handleSubmit, status, stop, reload } = useChat({
    api: '/api/ai/studio-chat',
    body: { websiteId },
  });

  // status: 'submitted' | 'streaming' | 'ready' | 'error'
  return (
    <div>
      {messages.map(m => <Message key={m.id} {...m} />)}
      {status === 'streaming' && <TypingIndicator />}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

## Tools Definition

```typescript
import { z } from 'zod';

const tools = {
  editSection: {
    description: 'Edit the content of a website section',
    parameters: z.object({
      sectionId: z.string().uuid(),
      updates: z.record(z.unknown()),
    }),
    execute: async ({ sectionId, updates }) => {
      // Apply changes to section
      return { success: true, sectionId };
    },
  },
  addSection: {
    description: 'Add a new section to the page',
    parameters: z.object({
      sectionType: z.string(),
      content: z.record(z.unknown()),
      position: z.number().optional(),
    }),
    execute: async ({ sectionType, content, position }) => {
      // Create section
      return { success: true, sectionId: newId };
    },
  },
};
```

## Rate Limiting

```typescript
// 3 tiers
const TIERS = {
  editor: { maxRequests: 20, windowMs: 60000, maxDailyCostUsd: 5 },
  public: { maxRequests: 5, windowMs: 60000, maxDailyCostUsd: 1 },
  copilot: { maxRequests: 10, windowMs: 60000, maxDailyCostUsd: 10 },
};

// Usage
const { allowed, remaining, resetAt } = await checkRateLimit(accountId, 'editor');
if (!allowed) return 429;
```

## Existing Endpoints (8)

| Route | Function | Cost |
|---|---|---|
| `/api/ai/editor/copilot` | `generateObject` — action plan | ~$0.008 |
| `/api/ai/editor/generate-section` | `generateObject` — section content | ~$0.003 |
| `/api/ai/editor/improve-text` | `generateObject` — 6 text actions | ~$0.002 |
| `/api/ai/editor/score-content` | Algorithmic — 21 checks | $0 |
| `/api/ai/editor/suggest-sections` | `generateObject` — recommendations | ~$0.003 |
| `/api/ai/editor/generate-blog` | `generateObject` — blog post | ~$0.01-0.015 |
| `/api/ai/editor/generate-cluster-plan` | `generateObject` — SEO plan | ~$0.008 |
| `/api/ai/public-chat` | `streamText` — visitor chat | ~$0.001 |

## 10 Studio Chat Tools

| Tool | Maps to | Source |
|---|---|---|
| `editSection` | `rewrite_text` | Existing action |
| `addSection` | `create_section` | Existing action |
| `removeSection` | `remove_section` | Existing action |
| `reorderSections` | `reorder_sections` | Existing action |
| `updateSEO` | `update_seo` | Existing action |
| `suggestImages` | `suggest_images` | Existing action |
| `translateContent` | `translate` | Existing action |
| `updateTheme` | `update_theme` | Existing action |
| `generateContent` | NEW | Calls generate-section API |
| `suggestSections` | NEW | Calls suggest-sections API |
