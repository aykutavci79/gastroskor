import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peau & Os (Deri & Kemik) - Nouvelles turques contemporaines",
  description:
    "Découvrez des nouvelles turques contemporaines en français. Récits littéraires par deri et kemik.",
};

export default async function HomeFr() {
  return (
    <HomePage
      locale="fr"
      dict={{
        brandTitle: "Peau & Os",
        brandSubtitle:
          "Un voyage littéraire au cœur de la condition humaine, entre identité, mémoire et transformation.",
        btnDeri: "Lire les histoires de deri",
        btnKemik: "Découvrir kemik",
        btnDeriHref: "/fr/deri",
        btnKemikHref: "/fr/kemik",
        philosophyTitle: "La philosophie Peau & Os",
        philosophyBody:
          "Peau & Os est un projet littéraire qui cherche l’essentiel sous la surface. Nous explorons les émotions fondamentales et les questions existentielles à travers des nouvelles turques contemporaines, portées par deux voix distinctes.",
        philosophyCta: "En savoir plus sur les auteurs",
        philosophyHref: "/fr/about",
        latestTitle: "Dernières histoires",
        emptyStories: "Aucune histoire pour le moment. Revenez bientôt !",
        newsletterTitle: "Recevoir les nouvelles histoires",
        newsletterBody:
          "Soyez informé en premier des nouvelles publications. Abonnez-vous à la newsletter.",
        dir: "ltr",
      }}
      take={6}
    />
  );
}
