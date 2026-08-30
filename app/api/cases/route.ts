import { getPublicCases, promoteLiveSignal } from "../../lib/case-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ cases: await getPublicCases() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Faultline case list failed", error);
    return Response.json({ error: "Investigation cases are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => null) as { snapshotId?: number; observationId?: number } | null;
  const snapshotId = Number(input?.snapshotId);
  const observationId = input?.observationId == null ? undefined : Number(input.observationId);
  if (!Number.isSafeInteger(snapshotId) || snapshotId < 1) return Response.json({ error: "A valid snapshot is required." }, { status: 400 });
  if (observationId !== undefined && (!Number.isSafeInteger(observationId) || observationId < 1)) return Response.json({ error: "The observation is invalid." }, { status: 400 });

  try {
    const investigationCase = await promoteLiveSignal(snapshotId, observationId);
    return Response.json({ case: investigationCase }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Faultline case promotion failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create the case." }, { status: 502 });
  }
}
