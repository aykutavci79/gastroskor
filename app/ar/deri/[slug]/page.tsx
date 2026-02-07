import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
};

export default async function ArOykuBridgePage({ params }: Props) {
  const slug = params.slug;

  const story = await prisma.story.findFirst({
    where: {
      slug,
      language: "ar",
    },
    select: {
      slug: true,
      author: true,
    },
  });

  if (!story) {
    notFound();
  }

  // AR’da detay sayfaları author route’larında yaşıyor
  if (story.author === "deri") {
    redirect(`/ar/deri/${story.slug}`);
  }

  if (story.author === "kemik") {
    redirect(`/ar/kemik/${story.slug}`);
  }

  // Beklenmeyen author değeri varsa güvenli fallback
  notFound();
}
