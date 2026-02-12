import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skin & Bone (Deri & Kemik) - Turkish Short Stories in English",
  description:
    "Explore contemporary Turkish short fiction in English translation. Literary narratives by deri and kemik.",
};

export default async function HomeEn() {
  return (
    <HomePage
      locale="en"
      dict={{
        brandTitle: "Skin and Bone",
        brandSubtitle:
          "A literary journey through the human condition, exploring themes of identity, memory, and transformation.",
        btnDeri: "Read deri’s stories",
        btnKemik: "Discover kemik",
        btnDeriHref: "/en/deri",
        btnKemikHref: "/en/kemik",
        philosophyTitle: "The Skin & Bone Philosophy",
        philosophyBody:
          "Skin & Bone is a literary project devoted to reaching what lies beneath the surface. We explore fundamental emotions and existential questions through contemporary Turkish short fiction, carried by two distinct voices.",
        philosophyCta: "Learn more about the authors",
        philosophyHref: "/en/about",
        latestTitle: "Latest Stories",
        emptyStories: "No stories available yet. Check back soon!",
        newsletterTitle: "Stay in the loop",
        newsletterBody:
          "Be the first to hear about new stories. Subscribe to our newsletter.",
        dir: "ltr",
      }}
      take={6}
    />
  );
}
