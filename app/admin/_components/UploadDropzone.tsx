'use client'

import { useCallback, useRef, useState } from 'react'

type Props = {
  value?: string
  onUploaded: (url: string) => void
}

export default function UploadDropzone({ value, onUploaded }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const uploadFile = useCallback(async (file: File) => {
    setErr(null)
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      setErr(`Sadece PNG / JPG / WEBP. Dosya tipi: ${file.type || '(boş)'}`)
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      setErr(`Maksimum 6MB. Şu an: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${data?.error || 'Upload failed (no error msg)'}`)
      }

      onUploaded(data.url)
    } catch (e: any) {
      setErr(e?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }, [onUploaded])

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) await uploadFile(file)
  }, [uploadFile])

  return (
    <div className="space-y-2">
      <div
        className={[
          'rounded-lg border border-dashed p-4 transition-colors',
          isDragging ? 'border-primary bg-muted/40' : 'border-border/60',
        ].join(' ')}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-sm font-medium">Görseli buraya sürükle-bırak</div>
          <div className="text-xs text-foreground/60">PNG / JPG / WEBP, max 6MB</div>

          <button
            type="button"
            className="mt-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-60"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? 'Yükleniyor…' : 'Dosya seç'}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={async (e) => {
  const file = e.target.files?.[0]
  if (file) await uploadFile(file)
            }}
          />
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {value && (
        <div className="rounded-lg border p-3">
          <div className="text-xs text-foreground/60 mb-2">Preview</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="illustration" className="max-h-56 w-auto rounded-md border" />
          <div className="mt-2 text-xs text-foreground/60 break-all">{value}</div>
        </div>
      )}
    </div>
  )
}
