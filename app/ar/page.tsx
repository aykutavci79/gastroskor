import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جلد وعظم (ديري وكيميك) - قصص تركية معاصرة",
  description:
    "قصص تركية معاصرة باللغة العربية. نصوص أدبية بقلم ديري وكيميك.",
};

export default async function HomeAr() {
  return (
    <HomePage
      locale="ar"
      dict={{
        brandTitle: "جلد وعظم",
        brandSubtitle:
          "رحلةٌ أدبيةٌ إلى قلبِ التجربةِ الإنسانية: هوية، ذاكرة، وتحول.",
        btnDeri: "اقرأ قصص ديري",
        btnKemik: "اكتشف كيميك",
        btnDeriHref: "/ar/deri",
        btnKemikHref: "/ar/kemik",
        philosophyTitle: "فلسفة جلد وعظم",
        philosophyBody:
          "جلد وعظم مشروعٌ أدبيّ يبحث عمّا تحت السطح. نكتب عن المشاعر الأساسية والأسئلة الوجودية بلغةٍ أدبية، عبر قصصٍ تركية معاصرة بصوتين مختلفين.",
        philosophyCta: "اعرف المزيد عن الكاتبين",
        philosophyHref: "/ar/hakkimizda",
        latestTitle: "آخر ما نُشر",
        emptyStories: "لا قصص هنا بعد. عد إلينا قريبًا.",
        newsletterTitle: "كن أول من يعرف",
        newsletterBody:
          "اشترك لتصلك تنبيهات القصص الجديدة أولًا بأول.",
        dir: "rtl",
      }}
      take={6}
    />
  );
}
