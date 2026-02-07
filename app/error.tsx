"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Bir hata oldu
      </h2>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        Sayfa render edilirken bir sorun çıktı. Yeniden denemeyi deneyebilirsin.
      </p>

      <button
        onClick={() => reset()}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ccc",
          cursor: "pointer",
        }}
      >
        Tekrar dene
      </button>

      <pre
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          background: "#f6f6f6",
          overflow: "auto",
          fontSize: 12,
        }}
      >
        {error?.message}
      </pre>
    </div>
  );
}
