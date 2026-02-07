export const metadata = {
  title: "Kemik | DeriveKemik",
  description: "Stories by Kemik (English)",
};

export default function EnKemikPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Kemik</h1>
      <p className="mt-3 text-sm text-neutral-600">Coming soon.</p>

      <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-neutral-700">
          This page is intentionally empty for now. We’ll wire it to DB when kemik author separation is ready.
        </p>
      </div>
    </main>
  );
}
