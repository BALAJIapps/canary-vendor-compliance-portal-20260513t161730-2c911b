import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { canaryVendors, canaryNotifications } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reviewerNote, reviewedBy } = body;

    if (!action || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "action must be 'approved' or 'rejected'" } },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(canaryVendors)
      .where(eq(canaryVendors.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Vendor not found" } },
        { status: 404 }
      );
    }

    const [vendor] = await db
      .update(canaryVendors)
      .set({
        status: action,
        reviewerNote: reviewerNote || null,
        reviewedBy: reviewedBy || "admin",
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(canaryVendors.id, id))
      .returning();

    // Record notification
    const notificationType = action === "approved" ? "vendor_approved" : "vendor_rejected";
    await db.insert(canaryNotifications).values({
      vendorId: id,
      type: notificationType,
      message: `Vendor ${existing.companyName} has been ${action} by ${reviewedBy || "admin"}. Note: ${reviewerNote || "N/A"}`,
      status: "sent",
    });

    return NextResponse.json({ ok: true, vendor });
  } catch (error) {
    console.error("[canary-vendors approve POST]", error);
    return NextResponse.json(
      { ok: false, error: { code: "APPROVE_ERROR", message: "Failed to update vendor status" } },
      { status: 500 }
    );
  }
}
