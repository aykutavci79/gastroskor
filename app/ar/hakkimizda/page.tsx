// app/ar/hakkimizda/page.tsx
import type { Metadata } from "next";
import { Heart, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "من نحن | Deri & Kemik",
  description: "Deri & Kemik hakkında: السطح (Deri) والجوهر (Kemik) بين رحلة أدبية.",
};

export default function AboutArPage() {
  return (
    <main
      lang="ar"
      dir="rtl"
      className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-10"
    >
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100/70 ring-1 ring-neutral-200 shadow-sm">
            <Users className="h-9 w-9 text-neutral-500" aria-hidden="true" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-700">
            من نحن
          </h1>

          <p className="mt-3 text-lg sm:text-xl text-neutral-500">
            نقشر السطح لنصل إلى الجوهر
          </p>
        </div>

        {/* Card */}
        <section className="mt-10 sm:mt-12">
          <div className="rounded-3xl bg-white/60 backdrop-blur shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-neutral-200/70 px-6 sm:px-10 py-8 sm:py-10">
            <h2 className="flex items-center gap-3 text-2xl sm:text-3xl font-semibold text-neutral-700">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 ring-1 ring-neutral-200">
                <Heart
                  className="h-5 w-5 text-neutral-500"
                  aria-hidden="true"
                />
              </span>
              فلسفة Deri &amp; Kemik
            </h2>

            <div className="mt-6 space-y-5 text-[15px] sm:text-base leading-8 text-neutral-600">
              <p>
                <strong className="font-semibold text-neutral-700">
                  Deri &amp; Kemik
                </strong>{" "}
                ليست مجرد مشروع أدبي، بل هي أيضا طريقة تفكير. الاسم يرمز إلى أكثر
                مكوّنين جسديين أساسيين في الإنسان: السطح{" "}
                <strong className="font-semibold text-neutral-700">(Deri)</strong>{" "}
                والجوهر{" "}
                <strong className="font-semibold text-neutral-700">(Kemik)</strong>.
              </p>

              <p>
                <strong className="font-semibold text-neutral-700">Deri</strong>{" "}
                هي الواجهة التي يراها العالم: الأقنعة الاجتماعية، وطبقة الحياة
                اليومية. أما{" "}
                <strong className="font-semibold text-neutral-700">Kemik</strong>{" "}
                فهي الحقيقة الكامنة تحتها: الواقع العاري، وهيكل الداخل الذي يسند
                الوجود.
              </p>

              <p>
                مقاربتنا الأدبية تركز على الرحلة بين هاتين الطبقتين. نطمح إلى
                اكتشاف التوترات النفسية والفلسفية العميقة المختبئة تحت أحداث تبدو
                عادية، وأن نمنح القارئ نصا لا يكتفي بالإمتاع، بل يوقظ التفكير
                ويحفّز التحوّل.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
