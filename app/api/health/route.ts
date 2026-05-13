import { NextResponse } from "next/server";
import { db } from "@/db";
import { canaryVendors } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.select().from(canaryVendors).limit(1);
    return NextResponse.json({ ok: true, status: "healthy", checks: { db: "ok" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, status: "degraded", checks: { db: "error" } },
      { status: 503 }
    );
  }
}
