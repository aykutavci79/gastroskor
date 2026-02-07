import type { Metadata } from "next";
import Link from "next/link";
import type { Story } from "@prisma/client";
import StoryCardImage from "@/components/StoryCardImage";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جلد وعظم (ديري وكيميك) - قصص تركية معاصرة",
  description:
    "قصص تركية معاصرة باللغة العربية. نصوص أدبية بقلم ديري وكيميك.",
};

export default async function ArabicHomePage() {
  const stories: Story[] = await prisma.story.findMany({
    where: { language: "ar" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Section Hero */}
      <section className="py-20 px-4 text-center border-b border-primary/10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-primary">
              جلد وعظم
            </h1>
            <p className="text-sm text-muted-foreground">(ديري وكيميك)</p>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground font-serif italic">
            قصصٌ تركيةٌ معاصرةٌ
          </p>

          <p className="text-lg text-foreground/80 max-w-2xl mx-auto leading-relaxed">
            رحلةٌ أدبيةٌ إلى قلبِ التجربةِ الإنسانية، بين الهويةِ والذاكرةِ والتحوّل،
            بصوتين يكتبان من حافةِ الشعور.
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Link
              href="/ar/stories"
              className="px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md font-medium"
            >
              تصفّح القصص
            </Link>

            <Link
              href="/ar/about"
              className="px-8 py-3 border border-primary text-primary hover:bg-primary/5 transition-colors rounded-md font-medium"
            >
              من نحن
            </Link>
          </div>
        </div>
      </section>

      {/* أحدث/آخر ما نُشر */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif font-bold mb-8 text-center">
            آخر ما نُشر
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story: Story) => (
              <Link key={story.id} href={`/ar/story/${story.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  <div className="relative aspect-[4/3] bg-muted">
                    <StoryCardImage
                      src={story.illustrationUrl}
                      alt={story.title}
                      className="object-cover"
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-serif font-bold mb-2 line-clamp-2">
                      {story.title}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-3">
                      بقلم {story.author}{" "}
                      {new Date(story.publishedAt).toLocaleDateString("ar", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>

                    <p className="text-foreground/80 line-clamp-3">
                      {story.excerpt ?? ""}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {stories.length === 0 && (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                لا قصص هنا بعد. عد إلينا قريبًا.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section About */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-serif font-bold">عن الكاتبين</h2>

          <div className="grid md:grid-cols-2 gap-8 text-right">
            <div className="space-y-3">
              <h3 className="text-2xl font-serif font-bold text-primary">
                ديري (جلد)
              </h3>
              <p className="text-foreground/80 leading-relaxed">
                صوتٌ يتتبّع هشاشةَ الحدود بين الواقع والإدراك، ويكتب حكاياتٍ تنزل إلى
                الأعماق حيث النفسُ تتكلّم والعاطفةُ تترك أثرها.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-serif font-bold text-primary">
                كيميك (عظم)
              </h3>
              <p className="text-foreground/80 leading-relaxed">
                قريبًا… نصوصٌ تتساءل عن بنية الوجود، وعن الأطر التي تُقيمنا،
                واللحظات التي تُصدّعنا ثم تعيد تشكيلنا.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
