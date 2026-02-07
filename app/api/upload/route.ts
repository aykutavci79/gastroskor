export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof (file as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const f = file as File;

    if (!f.type?.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const bytes = await f.arrayBuffer();
    const data = new Uint8Array(bytes); // Buffer yok -> TS daha az ağlar

    const ext = path.extname(f.name || "") || ".png";
    const filename = `${crypto.randomUUID()}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    await writeFile(path.join(uploadDir, filename), data);

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
