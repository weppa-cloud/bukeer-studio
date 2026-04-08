/**
 * Edge Function: [FUNCTION_NAME]
 * Description: [DESCRIPTION]
 * Created: [DATE]
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Types
interface RequestBody {
  // Define your request body structure
  param1: string;
  param2?: number;
}

interface ResponseData {
  // Define your response structure
  success: boolean;
  data?: unknown;
  error?: string;
}

// Helper: Create JSON response
function jsonResponse(data: ResponseData, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Helper: Error response
function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ success: false, error: message }, status);
}

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate method
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("No authorization header", 401);
    }

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Get user's account
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("account_id, role:roles(name)")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return errorResponse("User not found", 404);
    }

    const accountId = userData.account_id;
    const roleName = (userData.role as { name: string })?.name;

    // Parse request body
    const body: RequestBody = await req.json();

    // Validate required fields
    if (!body.param1) {
      return errorResponse("Missing required field: param1", 400);
    }

    // ============================================================
    // YOUR BUSINESS LOGIC HERE
    // ============================================================

    const result = await processRequest(supabase, accountId, body);

    // ============================================================

    return jsonResponse({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Function error:", error);

    // Handle specific errors
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }

    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});

// Business logic function
async function processRequest(
  supabase: SupabaseClient,
  accountId: string,
  body: RequestBody
): Promise<unknown> {
  // Example: Query database
  const { data, error } = await supabase
    .from("table_name")
    .select("*")
    .eq("account_id", accountId)
    .limit(10);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}
