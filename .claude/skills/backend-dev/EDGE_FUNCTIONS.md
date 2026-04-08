# Edge Functions Guide (Deno)

## Basic Structure

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse request body
    const body = await req.json();

    // Your business logic here
    const result = await processRequest(supabase, body);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

## Authentication Patterns

### Verify JWT Token

```typescript
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### Get User's Account

```typescript
const { data: userData } = await supabase
  .from("users")
  .select("account_id, role:roles(name)")
  .eq("id", user.id)
  .single();

const accountId = userData?.account_id;
const roleName = userData?.role?.name;
```

### Check Permissions

```typescript
if (roleName !== "Admin" && roleName !== "SuperAdmin") {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

## External API Integration

```typescript
// Example: Calling external payment API
const response = await fetch("https://api.stripe.com/v1/charges", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    amount: amount.toString(),
    currency: "usd",
    source: tokenId,
  }),
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}

const charge = await response.json();
```

## Error Handling

```typescript
function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500) {
  return createResponse({ error: message }, status);
}

// Usage
try {
  // ... logic
} catch (error) {
  console.error("Function error:", error);

  if (error.message.includes("not found")) {
    return errorResponse("Resource not found", 404);
  }
  if (error.message.includes("unauthorized")) {
    return errorResponse("Unauthorized", 401);
  }

  return errorResponse("Internal server error", 500);
}
```

## Environment Variables

```typescript
// Access environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Custom secrets (set via dashboard or CLI)
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const amadeusKey = Deno.env.get("AMADEUS_API_KEY");
```

## Database Operations

```typescript
// Using service role for admin operations
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Insert
const { data, error } = await supabaseAdmin
  .from("table_name")
  .insert({ column: value })
  .select()
  .single();

// Update
const { data, error } = await supabaseAdmin
  .from("table_name")
  .update({ column: newValue })
  .eq("id", recordId)
  .select()
  .single();

// RPC call
const { data, error } = await supabase.rpc("function_name", {
  param1: value1,
  param2: value2,
});
```

## Deployment

```bash
# Deploy function
supabase functions deploy function-name

# Deploy with secrets
supabase secrets set STRIPE_SECRET_KEY=sk_xxx
supabase functions deploy function-name

# View logs
supabase functions logs function-name
```

## Testing Locally

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/function-name \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

## Common Patterns

### Webhook Handler

```typescript
// Verify webhook signature
const signature = req.headers.get("stripe-signature");
const body = await req.text();

try {
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    Deno.env.get("STRIPE_WEBHOOK_SECRET")!
  );
  // Process event
} catch (err) {
  return errorResponse("Webhook signature verification failed", 400);
}
```

### Rate Limiting

```typescript
const rateLimit = new Map<string, number>();
const LIMIT = 100;
const WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimit.get(ip) || 0;

  if (requests >= LIMIT) {
    return false;
  }

  rateLimit.set(ip, requests + 1);
  setTimeout(() => rateLimit.delete(ip), WINDOW);
  return true;
}
```

### Response Caching

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300", // 5 minutes
  },
});
```
