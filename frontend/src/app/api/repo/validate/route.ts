import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const repoPath = request.nextUrl.searchParams.get("path");
  if (!repoPath) {
    return NextResponse.json({ error: "path parameter required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BACKEND}/api/repo/validate?path=${encodeURIComponent(repoPath)}`
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Backend unavailable", details: String(error) },
      { status: 502 }
    );
  }
}
