import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

function pickFileFromFormData(formData: FormData): File | null {
  // Try common field names first
  const candidates = ["file", "image", "illustration", "upload"];
  for (const key of candidates) {
    const v = formData.get(key);
    if (v instanceof File) return v;
  }
  // Otherwise pick the first File in the form data
  for (const [, v] of formData.entries()) {
    if (v instanceof File) return v;
  }
  return null;
}

function extFromFile(file: File): string {
  // Prefer filename extension if present
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  if (dot !== -1 && dot < name.length - 1) return name.slice(dot + 1).toLowerCase();

  // Fallback from mime type
  const t = (file.type || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("webp")) return "webp";
  if (t.includes("gif")) return "gif";
  return "bin";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = pickFileFromFormData(formData);

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Optional size guard (UI says 6MB; server limits may be lower in some environments)
    const maxBytes = 6 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File too large. Max 6MB." },
        { status: 413 }
      );
    }

    const ext = extFromFile(file);
    const key = `uploads/story_${crypto.randomUUID()}.${ext}`;

    // Upload to Vercel Blob (uses BLOB_READ_WRITE_TOKEN automatically on Vercel)
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url, pathname: blob.pathname }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed." },
      { status: 500 }
    );
  }
}
