import Link from 'next/link';

type Props = {
  title: string;
  updated: string;
  children: React.ReactNode;
};

export function LegalDocument({ title, updated, children }: Props) {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Ana sayfa
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-content">{title}</h1>
        <p className="mt-2 text-sm text-content-muted">Son güncelleme: {updated}</p>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-content-muted">{children}</div>
    </article>
  );
}
