import { getLiveSignalMemory } from "../../lib/live-store";
import { faultlineSupabaseKey, faultlineSupabaseUrl } from "../../lib/supabase-public";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const memory = await getLiveSignalMemory();
    return Response.json({ ...memory, realtime: { url: faultlineSupabaseUrl, key: faultlineSupabaseKey } }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Faultline live memory read failed", error);
    return Response.json({ error: "Live signal memory is temporarily unavailable." }, { status: 503 });
  }
}
