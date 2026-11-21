import { readSettings } from "@/lib/benefit-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request) {
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return Response.json({ error: "Zaloguj się jako administrator." }, { status: 401 });
  const db = createAdminClient();
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || user?.app_metadata.benefit_admin !== true) {
    return Response.json({ error: "Brak uprawnień do zmiany parametrów." }, { status: 403 });
  }
  const settings = readSettings(await request.json().catch(() => null));
  if (!settings) return Response.json({ error: "Sprawdź zakres wartości. Pula dla wieloraczków musi być co najmniej równa puli dla jednego dziecka." }, { status: 400 });
  const { error } = await db.from("benefit_settings").upsert({ id: true, overrides: settings });
  if (error) return Response.json({ error: "Nie udało się zapisać parametrów. Spróbuj ponownie." }, { status: 503 });
  return Response.json({ settings });
}
