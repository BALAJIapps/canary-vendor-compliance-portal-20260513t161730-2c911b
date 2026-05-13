import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { canaryVendors, canaryNotifications } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const vendors = await db
      .select()
      .from(canaryVendors)
      .orderBy(desc(canaryVendors.createdAt));
    return NextResponse.json({ ok: true, vendors });
  } catch (error) {
    console.error("[canary-vendors GET]", error);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch vendors" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, contactName, contactEmail, category } = body;

    if (!companyName || !contactName || !contactEmail || !category) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "All fields are required" } },
        { status: 400 }
      );
    }

    const [vendor] = await db
      .insert(canaryVendors)
      .values({ companyName, contactName, contactEmail, category, status: "pending" })
      .returning();

    // Record notification for audit trail
    await db.insert(canaryNotifications).values({
      vendorId: vendor.id,
      type: "vendor_registered",
      message: `New vendor registered: ${companyName} (${contactEmail})`,
      status: "pending",
    });

    return NextResponse.json({ ok: true, vendor }, { status: 201 });
  } catch (error) {
    console.error("[canary-vendors POST]", error);
    return NextResponse.json(
      { ok: false, error: { code: "CREATE_ERROR", message: "Failed to create vendor" } },
      { status: 500 }
    );
  }
}
