import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { loadParties } from "@/lib/guests";
import { listRsvps } from "@/lib/store";
import { toCsv } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const [parties, rsvps] = await Promise.all([loadParties(), listRsvps()]);
  const csv = toCsv(parties, rsvps);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvps-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
