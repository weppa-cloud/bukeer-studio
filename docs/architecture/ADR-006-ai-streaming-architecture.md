# ADR-006: Streaming-First AI Integration

**Status:** Accepted
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

Prompts are code. They live alongside the feature they serve:

```
lib/ai/
  prompts/
    studio-chat.ts        ← system prompt for studio chat
    section-generator.ts  ← prompt templates for section generation
    seo-suggestions.ts    ← SEO content improvement prompts
  llm-provider.ts         ← provider abstraction (OpenRouter)
  rate-limiter.ts         ← per-account rate limiting
  auth-helpers.ts         ← JWT extraction, role checks
```

### Rate limiting

Per-account rate limits stored in Supabase (no Redis):

| Tier | Requests/hour | Tokens/hour |
|---|---|---|
| Free | 20 | 50,000 |
| Pro | 100 | 500,000 |
| Enterprise | Unlimited | 2,000,000 |

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
