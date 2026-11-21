import { connection } from "next/server";
import { listSamples } from "@/lib/cases/samples";

/** Sample ZUS case files the jury can pick instead of uploading one. */
export async function GET() {
  await connection();
  try {
    return Response.json({ samples: await listSamples() });
  } catch (error) {
    console.error(error);
    return Response.json({ samples: [], error: "Przykładowe teczki są niedostępne." }, { status: 503 });
  }
}
