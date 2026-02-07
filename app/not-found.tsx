import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Sayfa bulunamadı
      </h2>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        Bu adres yok ya da taşınmış olabilir.
      </p>
      <Link href="/" style={{ textDecoration: "underline" }}>
        Ana sayfaya dön
      </Link>
    </div>
  );
}
