export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    service: "bukeer-studio",
  });
}
