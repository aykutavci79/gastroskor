import { Metadata } from "next"

export const metadata: Metadata = {
  title: "À propos - Deri & Kemik",
  description:
    "Découvrez deri et kemik, deux voix de la nouvelle turque contemporaine, au coeur de lexpérience humaine.",
}

export default function FrenchAboutPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary">
            À propos de Deri & Kemik
          </h1>
          <p className="text-xl text-muted-foreground font-serif italic">
            Deux voix, une seule vision littéraire
          </p>
        </header>

        <section className="prose prose-lg max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-serif font-bold text-primary">
              Notre philosophie
            </h2>
            <p className="text-foreground/80 leading-relaxed">
              Deri & Kemik est une plateforme littéraire dédiée à lexploration des
              profondeurs de lexpérience humaine à travers la nouvelle turque
              contemporaine. Nous croyons que les récits peuvent révéler des vérités
              cachées sous la surface du quotidien, ces couches secrètes de mémoire,
              didentité et de transformation qui façonnent ce que nous sommes.
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Par les voix complémentaires de nos deux auteurs, nous examinons la
              dualité de lexistence: le tendre et le dur, le visible et linvisible,
              léphémère et le permanent. Comme la peau et los, ces éléments sont
              indissociables, chacun donnant sens à lautre.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
              <h3 className="text-2xl font-serif font-bold text-primary">deri (peau)</h3>
              <p className="text-foreground/80 leading-relaxed">
                Les histoires de deri explorent les frontières fragiles entre réalité et
                perception, tissant des récits psychologiques qui sondent la complexité
                de la conscience. Portées par les personnages, elles interrogent la
                façon dont nous construisons et reconstruisons nos identités, souvent
                face au traumatisme, à la perte et à la métamorphose.
              </p>
              <p className="text-foreground/80 leading-relaxed">
                Ces textes se distinguent par une voix intime et des thèmes comme la
                dissociation, la mémoire, lobsession, et la quête de sens dans un monde
                qui résiste parfois à toute explication rationnelle.
              </p>
            </div>

            <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
              <h3 className="text-2xl font-serif font-bold text-primary">kemik (os)</h3>
              <p className="text-foreground/80 leading-relaxed">
                Les histoires de kemik arriveront bientôt. Là où la peau est surface et
                sensation, los représente la structure et lendurance. Les récits de
                kemik exploreront les cadres qui nous tiennent ensemble, structures
                sociales, familiales, existentielles, et les instants où ces cadres
                se fissurent ou seffondrent.
              </p>
              <p className="text-foreground/80 leading-relaxed italic text-muted-foreground">
                Nouvelles à venir...
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-8 border-t border-primary/10">
            <h2 className="text-3xl font-serif font-bold text-primary">
              Pourquoi le français?
            </h2>
            <p className="text-foreground/80 leading-relaxed">
              Bien que ces histoires naissent en turc, nous croyons au pouvoir universel
              du récit. En proposant des versions françaises, nous souhaitons partager
              ces explorations de la condition humaine avec un public plus large, en
              franchissant les frontières linguistiques et culturelles par le médium
              intemporel de la nouvelle.
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Chaque histoire conserve son authenticité culturelle tout en recherchant
              laccessibilité, en préservant les nuances de la tradition littéraire
              turque tout en parlant à des expériences profondément humaines.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}