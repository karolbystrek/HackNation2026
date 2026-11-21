export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in app/.env.local or Vercel.",
    );
  }

  return {
    url: new URL(url).href,
    serverUrl: new URL(process.env.SUPABASE_INTERNAL_URL || url).href,
    key,
    // Browser and Docker use different API hosts but must share session cookies.
    cookieOptions: { name: "hacknation-auth" },
  };
}
