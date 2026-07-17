import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Pack sales are not live yet. No funds were moved.",
      code: "PACK_SALES_NOT_LIVE",
    },
    { status: 409 }
  );
}
