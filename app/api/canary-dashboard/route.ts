import { NextResponse } from "next/server";
import { db } from "@/db";
import { canaryVendors, canaryVendorDocuments, canaryNotifications } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  try {
    const [totalVendors] = await db.select({ count: count() }).from(canaryVendors);
    const [pendingVendors] = await db.select({ count: count() }).from(canaryVendors).where(eq(canaryVendors.status, "pending"));
    const [approvedVendors] = await db.select({ count: count() }).from(canaryVendors).where(eq(canaryVendors.status, "approved"));
    const [rejectedVendors] = await db.select({ count: count() }).from(canaryVendors).where(eq(canaryVendors.status, "rejected"));
    const [totalDocuments] = await db.select({ count: count() }).from(canaryVendorDocuments);
    const [totalNotifications] = await db.select({ count: count() }).from(canaryNotifications);

    return NextResponse.json({
      ok: true,
      metrics: {
        totalVendors: totalVendors.count,
        pendingVendors: pendingVendors.count,
        approvedVendors: approvedVendors.count,
        rejectedVendors: rejectedVendors.count,
        totalDocuments: totalDocuments.count,
        totalNotifications: totalNotifications.count,
      },
    });
  } catch (error) {
    console.error("[canary-dashboard GET]", error);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch dashboard metrics" } },
      { status: 500 }
    );
  }
}
