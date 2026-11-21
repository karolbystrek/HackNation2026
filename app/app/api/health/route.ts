import { getSupabaseConfig } from "@/lib/supabase/config";

export async function GET() {
  try {
    const { serverUrl, key } = getSupabaseConfig();
    const response = await fetch(new URL("/auth/v1/settings", serverUrl), {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error("Supabase Auth API unavailable");

    return Response.json(
      { status: "ok", supabase: "connected" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", supabase: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
