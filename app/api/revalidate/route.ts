import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route: /api/revalidate
 *
 * Handles ISR revalidation requests from Supabase Edge Functions.
 * Called when website content is updated in Flutter editor.
 *
 * Request body:
 * - path: string - The path to revalidate (e.g., "/site/colombiatours")
 * - secret: string - Secret token for authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, secret } = body

    // Validate secret
    const expectedSecret = process.env.REVALIDATE_SECRET
    if (!expectedSecret) {
      console.error('[Revalidate] REVALIDATE_SECRET not configured')
      return NextResponse.json(
        { error: 'Revalidation not configured' },
        { status: 500 }
      )
    }

    if (secret !== expectedSecret) {
      console.error('[Revalidate] Invalid secret provided')
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      )
    }

    // Validate path
    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      )
    }

    // Revalidate the path
    revalidatePath(path)
    console.log(`[Revalidate] Successfully revalidated: ${path}`)

    return NextResponse.json({
      revalidated: true,
      path,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Revalidate] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/revalidate',
    method: 'POST',
    description: 'ISR revalidation endpoint for website content updates'
  })
}
