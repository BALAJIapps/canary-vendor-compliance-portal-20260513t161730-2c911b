import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { canaryNotifications } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const notifications = await db
      .select()
      .from(canaryNotifications)
      .orderBy(desc(canaryNotifications.createdAt))
      .limit(50);
    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    console.error("[canary-notifications GET]", error);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch notifications" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendorId, type, message } = body;

    if (!type || !message) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "type and message are required" } },
        { status: 400 }
      );
    }

    const [notification] = await db
      .insert(canaryNotifications)
      .values({ vendorId: vendorId || null, type, message, status: "pending" })
      .returning();

    return NextResponse.json({ ok: true, notification }, { status: 201 });
  } catch (error) {
    console.error("[canary-notifications POST]", error);
    return NextResponse.json(
      { ok: false, error: { code: "CREATE_ERROR", message: "Failed to create notification" } },
      { status: 500 }
    );
  }
}
