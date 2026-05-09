import { getMetricsSnapshot } from "@/lib/metrics";

export async function GET() {
  const snapshot = await getMetricsSnapshot();

  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
