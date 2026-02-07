import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function ArabicLayout({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen">
      {children}
    </div>
  );
}