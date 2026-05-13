import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { canaryVendorDocuments, canaryVendors, canaryNotifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");

    const query = db
      .select()
      .from(canaryVendorDocuments)
      .orderBy(desc(canaryVendorDocuments.uploadedAt));

    const documents = vendorId
      ? await db
          .select()
          .from(canaryVendorDocuments)
          .where(eq(canaryVendorDocuments.vendorId, vendorId))
          .orderBy(desc(canaryVendorDocuments.uploadedAt))
      : await query;

    return NextResponse.json({ ok: true, documents });
  } catch (error) {
    console.error("[canary-vendor-documents GET]", error);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch documents" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendorId, documentName, documentType, fileUrl, mimeType, sizeBytes } = body;

    if (!vendorId || !documentName || !documentType) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "vendorId, documentName, and documentType are required" } },
        { status: 400 }
      );
    }

    // Verify vendor exists
    const [vendor] = await db
      .select()
      .from(canaryVendors)
      .where(eq(canaryVendors.id, vendorId))
      .limit(1);

    if (!vendor) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Vendor not found" } },
        { status: 404 }
      );
    }

    const [document] = await db
      .insert(canaryVendorDocuments)
      .values({ vendorId, documentName, documentType, fileUrl, mimeType, sizeBytes })
      .returning();

    // Record notification
    await db.insert(canaryNotifications).values({
      vendorId,
      type: "document_uploaded",
      message: `Document uploaded: ${documentName} for vendor ${vendor.companyName}`,
      status: "pending",
    });

    return NextResponse.json({ ok: true, document }, { status: 201 });
  } catch (error) {
    console.error("[canary-vendor-documents POST]", error);
    return NextResponse.json(
      { ok: false, error: { code: "CREATE_ERROR", message: "Failed to record document" } },
      { status: 500 }
    );
  }
}
