"use client";

import { useRef, useState } from "react";

export default function StoryImageDropzone({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      onChange(data.url); // /uploads/xxx.jpg gibi
    } catch (e: any) {
      setError(e?.message || "Upload error");
    } finally {
      setIsUploading(false);
    }
  }

  function onPick() {
    inputRef.current?.click();
  }

  async function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    e.target.value = "";
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Kapak Görseli</div>

      <div
        className="rounded-2xl border p-4 hover:bg-muted/30"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {isUploading ? "Yükleniyor..." : "Sürükle-bırak ya da tıkla seç"}
          </div>

          <button
            type="button"
            onClick={onPick}
            className="rounded-xl border px-3 py-2 text-xs hover:bg-muted"
            disabled={isUploading}
          >
            Dosya seç
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />

        <div className="mt-3 text-xs text-muted-foreground">veya URL yapıştır:</div>
        <input
          className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />

        {error ? (
          <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {value ? (
          <div className="mt-4 rounded-2xl border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="cover"
              className="h-44 w-full rounded-xl object-cover"
              loading="lazy"
            />
            <div className="mt-2 break-all text-[11px] text-muted-foreground">{value}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
