# ADR-006: Streaming-First AI Integration

**Status:** Accepted
**Implementation Status:** Complete
**Date:** 2026-04-12
**Principles:** P9, P2, P10

## Context

bukeer-studio integrates LLM capabilities for:
- Section content generation (hero text, descriptions, CTAs)
- AI chat assistant in the studio editor
- SEO content suggestions
- Blog content generation

These operations call OpenRouter (routing to Anthropic Claude, OpenAI, etc.) and can take 5-30 seconds to complete. Buffering the full response before displaying creates an unacceptable UX.

Cloudflare Workers impose 128 MB memory and 30-second CPU time limits, making large response buffering impractical.

## Decision

### Streaming responses

All LLM endpoints stream tokens to the client as they arrive. No buffering.

```typescript
// app/api/ai/studio-chat/route.ts
import { streamText } from 'ai'
import { createOpenRouter } from '@ai-sdk/openai'

export async function POST(request: Request) {
  // 1. Auth + rate limit
  const auth = await getEditorAuth(request)
  if (!auth) return new Response('Unauthorized', { status: 401 })

  const rateOk = await checkRateLimit(auth.accountId)
  if (!rateOk) return new Response('Rate limited', { status: 429 })

  // 2. Build context + prompt
  const { messages, websiteContext } = await request.json()
  const systemPrompt = buildSystemPrompt(websiteContext)

  // 3. Stream response
  const result = streamText({
    model: createOpenRouter({ apiKey: process.env.OPENROUTER_AUTH_TOKEN }),
    system: systemPrompt,
    messages,
  })

  return result.toDataStreamResponse()
}
```

### Client consumption

Use Vercel AI SDK's `useChat` hook for chat UIs and `useCompletion` for single-shot generation:

```typescript
'use client'
import { useChat } from 'ai/react'

function StudioChat({ websiteId }: { websiteId: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/studio-chat',
    body: { websiteId },
  })
  // ...
}
```

### Structured output validation

When the LLM generates structured data (section configs, SEO metadata), validate with Zod before passing to the application:

```typescript
import { SectionConfigSchema } from '@bukeer/website-contract'

const result = await generateObject({
  model: openrouter,
  schema: SectionConfigSchema,
  prompt: `Generate a hero section for a luxury travel agency...`,
})

// result.object is already validated against the Zod schema
```

### Prompt management

Prompts are centralized in `lib/ai/prompts/`, exported via barrel:

```
lib/ai/
  prompts/
    studio-chat.ts        ← system prompt for studio chat assistant
    public-chat.ts        ← system prompt for visitor-facing chat
    section-generator.ts  ← prompt for AI section content generation
    improve-text.ts       ← action prompts (rewrite, shorten, translate, etc.)
    index.ts              ← barrel export
  llm-provider.ts         ← provider abstraction (OpenRouter)
  rate-limit.ts           ← per-account rate limiting (Supabase-based)
  auth-helpers.ts         ← JWT extraction, role checks
```

Each prompt is a function that accepts context and returns a string, making prompts testable and version-controllable.

### Rate limiting

Per-endpoint rate limits stored in Supabase (no Redis). Two dimensions: per-minute request throttling + daily cost cap.

| Tier | Requests/min | Daily cost cap |
|---|---|---|
| editor | 20 | $5.00 |
| public | 5 | $1.00 |
| copilot | 10 | $10.00 |

Rate limit windows use a 60-second sliding window for request counts and per-calendar-day aggregation for cost tracking.

### Tool use

The AI assistant can call tools (Zod-defined schemas) for structured operations:

```typescript
const tools = {
  updateSection: {
    description: 'Update a section on the page',
    parameters: UpdateSectionSchema,
    execute: async (params) => { /* ... */ },
  },
  suggestColors: {
    description: 'Suggest a color palette',
    parameters: ColorPaletteSchema,
    execute: async (params) => { /* ... */ },
  },
}
```

## Consequences

- **Instant feedback** — first token appears in <500ms
- **Memory-safe** — no large response buffering on Workers
- **Validated output** — LLM hallucinations caught before reaching UI
- **Trade-off:** Streaming adds complexity to error handling (partial responses)
- **Trade-off:** Tool use increases prompt size and LLM cost
- **Trade-off:** Rate limiting in Supabase has higher latency than Redis (~10ms vs ~1ms)

## References

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Next.js + LLMs: Streaming Structured Responses](https://www.calfus.com/post/next-js-llms-the-guide-to-streaming-structured-responses)
