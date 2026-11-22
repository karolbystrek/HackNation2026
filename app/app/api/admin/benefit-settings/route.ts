import { cookies } from "next/headers";
import { readSettings, SETTINGS_COOKIE } from "@/lib/benefit-settings";

export async function PUT(request: Request) {
  const settings = readSettings(await request.json().catch(() => null));
  if (!settings) return Response.json({ error: "Sprawdź zakres wartości. Pula dla wieloraczków nie może być mniejsza niż dla jednego dziecka, każda pula musi mieścić 2 części nieprzenoszalne, a część tylko dla matki nie może przekraczać macierzyńskiego." }, { status: 400 });
  (await cookies()).set(SETTINGS_COOKIE, JSON.stringify(settings), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return Response.json({ settings });
}
